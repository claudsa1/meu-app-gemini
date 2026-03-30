import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Spreadsheet ID from user
const SPREADSHEET_ID = '1a5w2AjWsrlYy0hLqTt1g4S_HmEPNgwVoiDIiiV318h4';

// Helper to get Google Auth JWT
async function getGoogleAuth() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Missing Google Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY)');
  }

  let key: string = privateKey;

  // 1. Check if the user accidentally pasted the entire JSON credentials file
  if (key.trim().startsWith('{')) {
    try {
      const credentials = JSON.parse(key);
      if (credentials.private_key) {
        key = credentials.private_key;
      }
    } catch (e) {
      console.warn('Attempted to parse private key as JSON but failed.');
    }
  }

  // 2. Clean up the private key
  key = key.trim();
  
  // Remove surrounding quotes
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1);
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.substring(1, key.length - 1);
  }
  
  // Handle escaped newlines (very common issue when pasting into a single-line input)
  key = key.replace(/\\n/g, '\n');
  
  // 3. Robust PEM formatting
  // If the key is missing headers, or is a single line of base64, we need to format it.
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    // Remove all whitespace
    const cleanBase64 = key.replace(/\s/g, '');
    // Wrap with headers and newlines every 64 chars
    key = `-----BEGIN PRIVATE KEY-----\n${cleanBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
  } else {
    // If it has headers but might have lost its newlines (replaced by spaces)
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    const startIndex = key.indexOf(header) + header.length;
    const endIndex = key.indexOf(footer);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const base64Part = key.substring(startIndex, endIndex).replace(/\s/g, '');
      key = `${header}\n${base64Part.match(/.{1,64}/g)?.join('\n')}\n${footer}`;
    }
  }

  console.log('Private key cleaned and formatted. Length:', key.length);

  return new JWT({
    email: serviceAccountEmail.trim(),
    key: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function GET(req: NextRequest) {
  console.log('GET /api/sync-orders called');
  try {
    const { searchParams } = new URL(req.url);
    const syncAll = searchParams.get('sync_all') === 'true';
    const paramSpreadsheetId = searchParams.get('spreadsheet_id');
    
    const targetSpreadsheetId = paramSpreadsheetId || SPREADSHEET_ID;

    const jwt = await getGoogleAuth();
    const doc = new GoogleSpreadsheet(targetSpreadsheetId, jwt);
    await doc.loadInfo();

    if (syncAll) {
      console.log('Starting manual sync of all orders from Supabase...');
      if (!supabase) {
        throw new Error('Supabase client not initialized. Check environment variables.');
      }

      const { data: orders, error: supabaseError } = await supabase
        .from('orders')
        .select('*')
        .order('Timestamp', { ascending: false });

      if (supabaseError) throw supabaseError;
      if (!orders || orders.length === 0) {
        return NextResponse.json({ status: 'ok', message: 'No orders found in Supabase to sync.' });
      }

      // Debug: Log the keys of the first order to see exactly how Supabase returns them
      const sampleOrder = orders[0];
      const availableKeys = Object.keys(sampleOrder);
      console.log('Available keys from Supabase:', availableKeys);

      const SHEET_NAME = 'ABERTAS';
      let sheet = doc.sheetsByTitle[SHEET_NAME];
      if (!sheet) sheet = doc.sheetsByIndex[0];

      await sheet.loadHeaderRow();
      const requiredHeaders = ['Order ID', 'Order Number', 'Timestamp', 'Estado', 'Item', 'Preço', 'User ID', 'Telefone', 'Localidade', 'PDF Link', 'last_updated'];
      
      // Only update headers if they are actually different to save time
      if (sheet.headerValues.length < requiredHeaders.length) {
        await sheet.setHeaderRow(requiredHeaders);
      }

      const rows = await sheet.getRows();
      console.log(`Syncing ${orders.length} orders against ${rows.length} existing rows...`);
      
      const newOrders = [];
      const updatedRows = [];
      
      for (const order of orders) {
        const orderId = String(order['Order ID'] || order.id);
        const existingRow = rows.find(r => String(r.get('Order ID')) === orderId);
        
        const pdfLink = order['PDF Link'] || order['pdf_link'] || order['pdf_url'] || order['PDF_Link'] || '';
        
        const rowData = {
          'Order Number': String(order['Order Number'] || ''),
          Estado: String(order.Estado || ''),
          Item: String(order.Item || ''),
          'Preço': String(order['Preço'] || ''),
          Telefone: String(order.Telefone || ''),
          Localidade: String(order.Localidade || ''),
          'PDF Link': String(pdfLink),
          last_updated: new Date().toISOString(),
        };

        if (existingRow) {
          let hasChanges = false;
          for (const [key, value] of Object.entries(rowData)) {
            if (String(existingRow.get(key)) !== value) {
              existingRow.set(key, value);
              hasChanges = true;
            }
          }
          if (hasChanges) {
            updatedRows.push(existingRow.save());
          }
        } else {
          newOrders.push({
            'Order ID': orderId,
            'User ID': String(order['User ID'] || ''),
            Timestamp: String(order.Timestamp || ''),
            ...rowData
          });
        }
      }

      console.log(`Found ${newOrders.length} new orders and ${updatedRows.length} modified rows.`);

      // Execute updates in parallel but with a bit of caution
      if (updatedRows.length > 0) {
        await Promise.all(updatedRows);
      }

      // Add new rows in a single batch operation (much faster)
      if (newOrders.length > 0) {
        await sheet.addRows(newOrders);
      }

      return NextResponse.json({ 
        status: 'ok', 
        message: `Sincronização concluída: ${newOrders.length} novas, ${updatedRows.length} atualizadas. Total: ${orders.length} processadas.`,
        debug: {
          newCount: newOrders.length,
          updatedCount: updatedRows.length,
          totalProcessed: orders.length
        }
      });
    }

    return NextResponse.json({ 
      status: 'ok', 
      message: 'API Route is active and successfully connected to Google Sheets.',
      config: {
        spreadsheetId: targetSpreadsheetId,
        spreadsheetTitle: doc.title,
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasPrivateKey: true
      }
    });
  } catch (error: any) {
    console.error('GET Auth Test Error:', error.message);
    
    let message = error.message;
    let tip = 'Check if GOOGLE_PRIVATE_KEY is correctly pasted in Secrets. It must include the BEGIN/END headers and use \\n for newlines if pasted as a single line.';
    
    if (message.includes('Failed to fetch')) {
      message = 'Failed to connect to Supabase or Google APIs (Failed to fetch).';
      tip = 'This usually means the Supabase URL is incorrect, the project is paused, or there is a network issue. Check your NEXT_PUBLIC_SUPABASE_URL and ensure your Supabase project is active.';
    }

    return NextResponse.json({ 
      status: 'error', 
      message,
      tip
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('--- [WEBHOOK] Request Received ---');
  try {
    const payload = await req.json();
    console.log('Payload structure:', JSON.stringify(payload, null, 2));

    // Support both direct record and nested record (Supabase variations)
    const type = payload.type || payload.event || 'INSERT';
    const table = payload.table || 'orders';
    const record = payload.record || payload.data || payload;
    
    console.log(`Processing ${type} for ${table}`);

    // If it's just a test or empty, acknowledge but don't fail
    if (!record || Object.keys(record).length < 2) {
      console.log('Payload too small, might be a test ping.');
      return NextResponse.json({ success: true, message: 'Ping received' });
    }

    // Auth with Google
    const jwt = await getGoogleAuth();
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, jwt);
    await doc.loadInfo();

    const SHEET_NAME = 'ABERTAS';
    let sheet = doc.sheetsByTitle[SHEET_NAME] || doc.sheetsByIndex[0];
    
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    
    const getRowValue = (row: any, headerName: string) => {
      const actualHeader = headers.find(h => h.toLowerCase() === headerName.toLowerCase());
      return actualHeader ? row.get(actualHeader) : undefined;
    };

    const orderId = String(record['Order ID'] || record.id || record.order_id || '');
    if (!orderId || orderId === 'undefined') {
      console.log('No valid Order ID found in record, skipping sync.');
      return NextResponse.json({ success: true, message: 'No ID found' });
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(row => String(getRowValue(row, 'Order ID')) === orderId);

    const pdfLink = record['PDF Link'] || record.pdf_link || record.pdf_url || '';

    const rowData = {
      'Order ID': orderId,
      'Order Number': String(record['Order Number'] || record.order_number || ''),
      Timestamp: String(record.Timestamp || record.created_at || ''),
      Estado: String(record.Estado || record.status || ''),
      Item: String(record.Item || record.items || ''),
      'Preço': String(record['Preço'] || record.price || record.total || ''),
      'User ID': String(record['User ID'] || record.user_id || ''),
      Telefone: String(record.Telefone || record.phone || ''),
      Localidade: String(record.Localidade || record.city || ''),
      'PDF Link': String(pdfLink),
      last_updated: new Date().toISOString(),
    };

    if (existingRow && type !== 'INSERT') {
      console.log('Updating existing row:', orderId);
      const setRowValue = (row: any, headerName: string, value: any) => {
        const actualHeader = headers.find(h => h.toLowerCase() === headerName.toLowerCase());
        if (actualHeader) row.set(actualHeader, value);
      };

      Object.entries(rowData).forEach(([key, value]) => {
        if (key !== 'Order ID') setRowValue(existingRow, key, value);
      });
      
      await existingRow.save();
    } else {
      console.log('Adding new row:', orderId);
      await sheet.addRow(rowData);
    }

    console.log('--- [WEBHOOK] Success ---');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('--- [WEBHOOK] Error ---', error.message);
    let message = error.message;
    if (message.includes('Failed to fetch')) {
      message = 'Failed to connect to external services (Supabase/Google) - Failed to fetch. Check your API configurations.';
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

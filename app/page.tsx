'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, ArrowRight, Upload, Edit3, BookOpen, FileText, Palette, Book, Sparkles, CheckCircle, ArrowLeft, Heart, Info, Camera, Layers, MapPin, ChevronDown, LogOut, User as UserIcon, Loader2, Mail, Lock, Hash, Globe, CreditCard, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';
import { ALBUMS, AlbumProposal, Frame, MiniFirstPage, EditableText } from '@/components/AlbumComponents';
import { Dashboard } from '@/components/Dashboard';
import { Order } from '@/lib/types';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const LOGO_URL = 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=200&auto=format&fit=crop'; // Updated to a working placeholder logo

const COMPANY_LOCATION = { lat: 41.3517, lng: -8.7431 }; // Rua Casal do Pedro, Vila do Conde


export default function Page() {
  const [view, setView] = useState<'home' | 'about' | 'portfolio' | 'albums' | 'editor' | 'login' | 'register' | 'dashboard'>('home');
  const [dashboardTab, setDashboardTab] = useState<'orders' | 'upload' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumProposal>(ALBUMS[0]);
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [albumTexts, setAlbumTexts] = useState<Record<string, string>>({
    'p1-title': 'O Nosso Casamento',
    'p2-text': 'O amor é a base de tudo o que construímos juntos.',
    'p4-text': 'A felicidade é partilhar cada momento ao teu lado.',
    'p6-text': 'União é sermos um só caminho, dois corações.',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [locality, setLocality] = useState('');
  const [nif, setNif] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const albumPrintRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<AlbumProposal[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;

    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && error.message.includes('Refresh Token Not Found')) {
        console.warn('Stale session detected, signing out...');
        if (supabase) {
          supabase.auth.signOut();
        }
        setUser(null);
        return;
      }
      setUser(session?.user ?? null);
      if (session?.user?.user_metadata?.avatar_url) {
        setAvatarUrl(session.user.user_metadata.avatar_url);
      }
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.user_metadata?.avatar_url) {
        setAvatarUrl(session.user.user_metadata.avatar_url);
      } else {
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !user) return;

    try {
      setIsUploadingAvatar(true);
      
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update User Metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      console.error('Error uploading avatar:', error.message);
      alert('Erro ao carregar a imagem. Verifique se o bucket "avatars" existe no seu Supabase Storage e tem políticas públicas.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (user && view === 'login') {
      const timer = setTimeout(() => setView('dashboard'), 0);
      return () => clearTimeout(timer);
    }
  }, [user, view]);

  useEffect(() => {
    if (!supabase || !user || view !== 'dashboard' || dashboardTab !== 'orders') return;

    const fetchOrders = async () => {
      if (!supabase) return;
      setIsOrdersLoading(true);
      console.log('Fetching orders for user:', user.id);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('Timestamp', { ascending: false });

        if (error) {
          console.error('Error fetching orders:', error.message);
        } else {
          console.log('Orders fetched successfully:', data);
          setOrders(data || []);
        }
      } catch (err: any) {
        console.error('Network error fetching orders:', err.message);
        if (err.message === 'Failed to fetch') {
          alert('Erro de ligação: Não foi possível contactar o servidor do Supabase. Verifique a sua ligação à internet ou as chaves de API.');
        }
      } finally {
        setIsOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [user, view, dashboardTab]);

  const addToCart = (album: AlbumProposal) => {
    setCart(prev => [...prev, album]);
    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const generateAlbumPDF = async (album: AlbumProposal) => {
    if (!albumPrintRef.current) return null;
    
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pages = albumPrintRef.current.children;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Use modern-screenshot which handles oklch/oklab correctly
        const canvas = await domToCanvas(page, {
          scale: 2,
          backgroundColor: '#ffffff',
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const pdfBlob = pdf.output('blob');
      const fileName = `album_${Date.now()}.pdf`;
      const filePath = `${user?.id}/${fileName}`;

      if (!supabase) throw new Error('Supabase is not configured.');

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('order-files')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) throw error;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('order-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      setPendingCheckout(true);
      setIsCartOpen(false); // Close cart so login view is clear
      setView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const itemsToOrder = cart.length > 0 ? cart : [selectedAlbum];
    
    setIsOrdering(true);
    try {
      const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Generate PDF for the current album (assuming one album for now, or loop for each)
      // For simplicity, we generate one PDF for the selectedAlbum if it's the one being ordered
      const pdfUrl = await generateAlbumPDF(selectedAlbum);

      const ordersToInsert = itemsToOrder.map(item => ({
        "Order Number": orderNumber,
        "Timestamp": new Date().toISOString(),
        "Estado": 'Pendente',
        "Item": item.name,
        "Preço": `€${item.price.toFixed(2)}`,
        "User ID": user.id,
        "Telefone": user.user_metadata?.phone || '',
        "Localidade": user.user_metadata?.locality || '',
        "PDF Link": pdfUrl || ''
      }));

      if (!supabase) throw new Error('Supabase is not configured.');

      const { data, error } = await supabase
        .from('orders')
        .insert(ordersToInsert)
        .select();

      if (error) throw error;

      // Success!
      setCart([]);
      setIsCartOpen(false);
      setView('dashboard');
      setDashboardTab('orders');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error placing order:', error.message);
      if (error.message === 'Failed to fetch') {
        alert('Erro de ligação: Não foi possível enviar a encomenda. Verifique a sua ligação à internet ou as chaves de API do Supabase.');
      } else if (error.message.includes('row-level security policy')) {
        alert('Erro de permissão: A política de segurança do Supabase (RLS) está a impedir a criação da encomenda. Por favor, verifique se as políticas RLS na tabela "orders" permitem inserções para o seu utilizador.');
      } else {
        alert('Erro ao processar a encomenda: ' + error.message);
      }
    } finally {
      setIsOrdering(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setLoginError('A ligação ao Supabase não está configurada.');
      return;
    }
    setIsLoading(true);
    setLoginError(null);

    if (!supabase) {
      setLoginError('Supabase is not configured.');
      return;
    }
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            address: address,
            postal_code: postalCode,
            locality: locality,
            nif: nif,
          }
        }
      });

      if (error) {
        setLoginError(error.message);
      } else {
        if (data.session) {
          // User was automatically logged in
          if (pendingCheckout) {
            setPendingCheckout(false);
            setIsCartOpen(true);
            setView('editor');
          } else {
            setView('dashboard');
          }
        } else {
          alert('Conta criada com sucesso! Verifique o seu email para confirmar a conta e depois faça login para finalizar a sua encomenda.');
          setEmail('');
          setPassword('');
          setFullName('');
          setAddress('');
          setPostalCode('');
          setLocality('');
          setNif('');
          setView('login');
        }
      }
    } catch (err: any) {
      console.error('Network error during registration:', err.message);
      if (err.message === 'Failed to fetch') {
        setLoginError('Erro de ligação: Não foi possível contactar o servidor do Supabase. Verifique a sua ligação à internet.');
      } else {
        setLoginError('Erro inesperado: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setLoginError('A ligação ao Supabase não está configurada. Por favor, adicione as chaves necessárias nos Secrets.');
      return;
    }
    setIsLoading(true);
    setLoginError(null);

    if (!supabase) {
      setLoginError('Supabase is not configured.');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoginError(error.message);
      } else {
        if (pendingCheckout) {
          setPendingCheckout(false);
          setIsCartOpen(true);
          // We don't call handlePlaceOrder immediately because 'user' state update is async
          // The user will see the cart open and can click "Finalizar Encomenda" again
          // Or we can use a useEffect to trigger it when user becomes non-null and pendingCheckout was true
          setView('editor'); // Go back to editor where the cart is visible
        } else {
          setView('dashboard');
        }
      }
    } catch (err: any) {
      console.error('Network error during login:', err.message);
      if (err.message === 'Failed to fetch') {
        setLoginError('Erro de ligação: Não foi possível contactar o servidor do Supabase. Verifique a sua ligação à internet.');
      } else {
        setLoginError('Erro inesperado: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setEmail('');
    setPassword('');
    setFullName('');
    setAddress('');
    setPostalCode('');
    setLocality('');
    setNif('');
    setView('home');
  };
  const totalPages = 6;

  const scrollToContacts = () => {
    setView('home');
    // Small delay to allow view transition before scrolling
    setTimeout(() => {
      footerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTextChange = (id: string, value: string) => {
    setAlbumTexts(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectAlbum = (album: AlbumProposal) => {
    setSelectedAlbum(album);
    setView('editor');
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerUpload = (frameId: string) => {
    setActiveFrameId(frameId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeFrameId) {
      const url = URL.createObjectURL(file);
      setUploadedImages(prev => ({ ...prev, [activeFrameId]: url }));
    }
  };

  const services = [
    { name: 'Álbuns de Casamento', view: 'albums' as const },
    { name: 'Impressão DTF', view: 'portfolio' as const },
    { name: 'Impressão DTF UV', view: 'portfolio' as const },
    { name: 'Impressão vinil', view: 'portfolio' as const },
    { name: 'Impressão de placas', view: 'portfolio' as const },
    { name: 'Impressão em acrílico', view: 'portfolio' as const },
    { name: 'Impressão a laser', view: 'portfolio' as const },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />
      {/* Hidden Print Container */}
      <div className="fixed -left-[9999px] -top-[9999px]" ref={albumPrintRef}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
          <div 
            key={pageNumber}
            className="w-[1120px] h-[840px] bg-white p-12 relative overflow-hidden flex flex-col items-center justify-center border border-outline-variant/10"
            style={{ pageBreakAfter: 'always' }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
              <span className="font-headline text-[40rem] rotate-12 select-none" style={{ color: selectedAlbum.accentColor }}>J</span>
            </div>

            {/* Editorial Layout Grid */}
            <div className="w-full h-full z-10">
              {pageNumber === 1 && (
                <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                  <div className="col-start-2 col-span-4 row-span-5 relative">
                    <Frame 
                      id={`p${pageNumber}-f1`} 
                      className="w-full h-full" 
                      label="Página de Abertura" 
                      uploadedImages={uploadedImages}
                      selectedAlbum={selectedAlbum}
                      triggerUpload={() => {}}
                    />
                  </div>
                  <div className="col-start-2 col-span-4 row-span-1 flex items-center justify-center">
                    <h1 className="text-3xl font-headline font-bold text-primary text-center tracking-tight">
                      {albumTexts['p1-title'] || 'Título do Álbum'}
                    </h1>
                  </div>
                </div>
              )}

              {pageNumber === 2 && (
                <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                  <Frame 
                    id={`p${pageNumber}-f1`} 
                    className="col-span-3 row-span-6" 
                    label="Retrato Principal" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <Frame 
                    id={`p${pageNumber}-f2`} 
                    className="col-span-3 row-span-3" 
                    label="Paisagem Superior" 
                    aspectRatio="landscape" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <Frame 
                    id={`p${pageNumber}-f3`} 
                    className="col-span-1 row-span-3" 
                    label="Detalhe" 
                    aspectRatio="square" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <div className="col-span-2 row-span-3 p-4 flex flex-col justify-end">
                    <div className="h-px w-12 bg-secondary mb-4"></div>
                    <h3 className="text-lg font-headline italic text-primary leading-tight mb-2">Momentos</h3>
                    <p className="text-[10px] font-body text-on-surface-variant/80">
                      {albumTexts['p2-text'] || ''}
                    </p>
                  </div>
                </div>
              )}

              {pageNumber === 3 && (
                <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                  <Frame 
                    id={`p${pageNumber}-f1`} 
                    className="col-span-3 row-span-6" 
                    label="Díptico Esquerdo" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <Frame 
                    id={`p${pageNumber}-f2`} 
                    className="col-span-3 row-span-6" 
                    label="Díptico Direito" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                </div>
              )}

              {pageNumber === 4 && (
                <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                  <Frame 
                    id={`p${pageNumber}-f1`} 
                    className="col-span-6 row-span-4" 
                    label="Panorâmica Central" 
                    aspectRatio="landscape" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <div className="col-span-6 row-span-2 flex items-center justify-center text-center p-8">
                    <div className="max-w-md">
                      <h3 className="text-2xl font-headline italic text-primary mb-2">A Beleza do Detalhe</h3>
                      <p className="text-xs font-body text-on-surface-variant/60 italic">
                        {albumTexts['p4-text'] || ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {pageNumber === 5 && (
                <div className="grid grid-cols-4 grid-rows-2 gap-4 w-full h-full">
                  <Frame 
                    id={`p${pageNumber}-f1`} 
                    className="col-span-2 row-span-1" 
                    label="Grelha A" 
                    aspectRatio="square" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <Frame 
                    id={`p${pageNumber}-f2`} 
                    className="col-span-2 row-span-1" 
                    label="Grelha B" 
                    aspectRatio="square" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <Frame 
                    id={`p${pageNumber}-f3`} 
                    className="col-span-2 row-span-1" 
                    label="Grelha C" 
                    aspectRatio="square" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <Frame 
                    id={`p${pageNumber}-f4`} 
                    className="col-span-2 row-span-1" 
                    label="Grelha D" 
                    aspectRatio="square" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                </div>
              )}

              {pageNumber === 6 && (
                <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                  <Frame 
                    id={`p${pageNumber}-f1`} 
                    className="col-span-4 row-span-6" 
                    label="Destaque Final" 
                    uploadedImages={uploadedImages}
                    selectedAlbum={selectedAlbum}
                    triggerUpload={() => {}}
                  />
                  <div className="col-span-2 row-span-6 grid grid-rows-3 gap-4">
                    <Frame 
                      id={`p${pageNumber}-f2`} 
                      className="row-span-1" 
                      label="Mini A" 
                      aspectRatio="square" 
                      uploadedImages={uploadedImages}
                      selectedAlbum={selectedAlbum}
                      triggerUpload={() => {}}
                    />
                    <Frame 
                      id={`p${pageNumber}-f3`} 
                      className="row-span-1" 
                      label="Mini B" 
                      aspectRatio="square" 
                      uploadedImages={uploadedImages}
                      selectedAlbum={selectedAlbum}
                      triggerUpload={() => {}}
                    />
                    <div className="row-span-1 flex flex-col justify-end p-4 border-t border-outline-variant/20">
                      <span className="text-[8px] font-label uppercase tracking-widest text-secondary mb-2">Fim do Volume</span>
                      <p className="text-sm font-headline italic text-primary">
                        {albumTexts['p6-text'] || ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TopNavBar */}
      <header className="bg-surface sticky top-0 z-50 border-b border-surface-container shadow-sm">
        <div className="flex justify-between items-center w-full px-6 md:px-12 py-6 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="relative w-12 h-12">
                <Image 
                  src={LOGO_URL} 
                  alt="Jungraf Logo" 
                  fill 
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as any).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-headline font-bold text-primary tracking-tight">Jungraf</span>
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Artes Gráficas</span>
              </div>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => {
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`font-medium transition-colors duration-300 ${view === 'home' ? 'text-primary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              Home
            </button>
            <button 
              onClick={() => {
                setView('about');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`font-medium transition-colors duration-300 ${view === 'about' ? 'text-primary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              Quem somos
            </button>
            
            <div className="relative group" onMouseEnter={() => setIsServicesOpen(true)} onMouseLeave={() => setIsServicesOpen(false)}>
              <button className="flex items-center gap-1 font-medium text-on-surface-variant hover:text-secondary transition-colors duration-300">
                Serviços
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isServicesOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-surface border border-surface-container shadow-xl rounded-sm overflow-hidden py-2 z-50"
                  >
                    {services.map((service, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setView(service.view);
                          setIsServicesOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full text-left px-6 py-3 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors border-b border-surface-container last:border-0"
                      >
                        {service.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => {
                setView('portfolio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`font-medium transition-colors duration-300 ${view === 'portfolio' ? 'text-primary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              Portfólio
            </button>
            
            <button 
              onClick={scrollToContacts}
              className="font-medium text-on-surface-variant hover:text-secondary transition-colors duration-300"
            >
              Contactos
            </button>
          </nav>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative group p-2 hover:bg-surface-container-low rounded-full transition-all"
            >
              <ShoppingBag className="text-primary w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                  {cart.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                if (user) {
                  setView('dashboard');
                } else {
                  setView('login');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-primary text-white px-6 py-2 rounded-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              {user ? (
                <>
                  <UserIcon className="w-4 h-4" />
                  Minha Conta
                </>
              ) : (
                'Área de Cliente'
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.main 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow"
          >
            {/* Hero Section */}
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
              <Image 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1920&auto=format&fit=crop" 
                alt="Workshop" 
                fill 
                className="object-cover brightness-50"
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 text-center px-6 max-w-4xl">
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-secondary font-label text-sm uppercase tracking-[0.3em] mb-6 block"
                >
                  Excelência em Artes Gráficas
                </motion.span>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-6xl md:text-8xl font-headline font-bold text-white mb-8 tracking-tight"
                >
                  Transformamos Ideias em <span className="italic text-secondary">Impressões Eternas</span>
                </motion.h1>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap justify-center gap-4"
                >
                  <button 
                    onClick={() => setView('albums')}
                    className="bg-secondary text-white px-8 py-4 font-label text-xs uppercase tracking-widest hover:bg-[#5d4201] transition-all flex items-center gap-2"
                  >
                    Ver Coleção de Álbuns <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={scrollToContacts}
                    className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 font-label text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    Falar Connosco
                  </button>
                </motion.div>
              </div>
            </section>

            {/* Services Highlight */}
            <section className="py-24 bg-surface-container-low">
              <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                  <div className="max-w-2xl">
                    <span className="text-secondary font-label text-xs uppercase tracking-widest mb-4 block">O Que Fazemos</span>
                    <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">Soluções Completas de Impressão</h2>
                  </div>
                  <button 
                    onClick={() => setView('portfolio')}
                    className="text-primary font-label text-xs uppercase tracking-widest border-b border-primary pb-1 hover:text-secondary hover:border-secondary transition-all"
                  >
                    Ver Portfólio Completo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { title: 'Impressão DTF & UV', desc: 'Tecnologia de ponta para têxteis e superfícies rígidas com durabilidade extrema.', icon: Sparkles },
                    { title: 'Corte & Gravação Laser', desc: 'Precisão milimétrica em acrílico, madeira e metais para acabamentos únicos.', icon: Palette },
                    { title: 'Vinil & Grandes Formatos', desc: 'Comunicação visual de alto impacto para montras, viaturas e eventos.', icon: Layers },
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-10 border border-outline-variant/10 hover:shadow-xl transition-all group">
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-white transition-colors">
                        <s.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-headline font-bold text-primary mb-4">{s.title}</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed mb-6">{s.desc}</p>
                      <button className="text-[10px] font-label uppercase tracking-widest text-primary flex items-center gap-2 group-hover:text-secondary transition-colors">
                        Saber Mais <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Featured Albums Preview */}
            <section className="py-24">
              <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-headline font-bold text-primary mb-4 tracking-tight">Álbuns de Casamento</h2>
                  <p className="text-on-surface-variant max-w-xl mx-auto">Artesanato puro para guardar as suas memórias mais preciosas.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {ALBUMS.slice(0, 2).map((album) => (
                    <div 
                      key={album.id} 
                      className="group cursor-pointer"
                      onClick={() => handleSelectAlbum(album)}
                    >
                      <div className="relative aspect-[16/9] overflow-hidden mb-6">
                        <Image 
                          src={album.coverImage} 
                          alt={album.name} 
                          fill 
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                        <div className="absolute bottom-8 left-8 text-white">
                          <span className="text-[10px] font-label uppercase tracking-[0.2em] mb-2 block">{album.tag}</span>
                          <h3 className="text-3xl font-headline font-bold">{album.name}</h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-12">
                  <button 
                    onClick={() => setView('albums')}
                    className="bg-primary text-white px-10 py-4 font-label text-xs uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Explorar Todos os Modelos
                  </button>
                </div>
              </div>
            </section>
          </motion.main>
        )}

        {view === 'about' && (
          <motion.main 
            key="about"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow py-24"
          >
            <div className="max-w-screen-xl mx-auto px-6 md:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="relative aspect-square">
                  <Image 
                    src="https://images.unsplash.com/photo-1507652313519-d4c9174996dd?q=80&w=800&auto=format&fit=crop" 
                    alt="Our History" 
                    fill 
                    className="object-cover rounded-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-10 -right-10 bg-secondary p-12 hidden md:block">
                    <span className="text-6xl font-headline font-bold text-white block">100+</span>
                    <span className="text-xs font-label uppercase tracking-widest text-white/80">Anos de História</span>
                  </div>
                </div>
                <div>
                  <span className="text-secondary font-label text-xs uppercase tracking-widest mb-4 block">Quem Somos</span>
                  <h2 className="text-5xl font-headline font-bold text-primary mb-8 tracking-tight">Uma Tradição de Excelência Gráfica</h2>
                  <div className="space-y-6 text-on-surface-variant leading-relaxed">
                    <p>
                      Fundada em Vila do Conde, a Jungraf nasceu da paixão pela tipografia e pelo detalhe. Ao longo de décadas, evoluímos de uma pequena oficina artesanal para uma referência nacional em artes gráficas, sem nunca perder o toque humano que nos define.
                    </p>
                    <p>
                      Hoje, combinamos o conhecimento ancestral dos nossos mestres artesãos com a tecnologia de impressão mais avançada do mundo. Desde álbuns de casamento costurados à mão até impressões DTF de alta precisão, cada projeto que sai das nossas mãos é um testemunho do nosso compromisso com a perfeição.
                    </p>
                    <p>
                      A nossa missão é simples: dar corpo e alma às suas ideias, garantindo que cada cor, cada textura e cada acabamento conte uma história de qualidade e dedicação.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mt-12">
                    <div>
                      <h4 className="text-3xl font-headline font-bold text-primary mb-2">Artesanal</h4>
                      <p className="text-xs text-on-surface-variant">Processos manuais que garantem exclusividade em cada peça.</p>
                    </div>
                    <div>
                      <h4 className="text-3xl font-headline font-bold text-primary mb-2">Inovador</h4>
                      <p className="text-xs text-on-surface-variant">Investimento constante em tecnologia de última geração.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {view === 'portfolio' && (
          <motion.main 
            key="portfolio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow py-24"
          >
            <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
              <div className="text-center mb-20">
                <span className="text-secondary font-label text-xs uppercase tracking-widest mb-4 block">Portfólio</span>
                <h2 className="text-5xl font-headline font-bold text-primary mb-6 tracking-tight">O Nosso Trabalho</h2>
                <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                  Explore uma seleção dos nossos projetos mais recentes. Da impressão têxtil aos acabamentos de luxo, cada peça reflete a nossa dedicação à arte gráfica.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { title: 'Álbuns de Casamento Premium', cat: 'Álbuns', img: 'https://images.unsplash.com/photo-1544144433-d50aff500b91?q=80&w=800&auto=format&fit=crop' },
                  { title: 'T-shirts Personalizadas', cat: 'Impressão DTF', img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=800&auto=format&fit=crop' },
                  { title: 'Brindes com Relevo', cat: 'Impressão DTF UV', img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop' },
                  { title: 'Decoração de Montras', cat: 'Impressão Vinil', img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop' },
                  { title: 'Sinalética Exterior', cat: 'Impressão de Placas', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop' },
                  { title: 'Troféus e Placas', cat: 'Impressão em Acrílico', img: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=800&auto=format&fit=crop' },
                  { title: 'Gravação em Madeira', cat: 'Impressão a Laser', img: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop' },
                ].map((p, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -10 }}
                    className="group relative aspect-[4/5] overflow-hidden bg-surface-container-low"
                  >
                    <Image 
                      src={p.img} 
                      alt={p.title} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                      <span className="text-secondary font-label text-[10px] uppercase tracking-widest mb-2">{p.cat}</span>
                      <h3 className="text-2xl font-headline font-bold text-white">{p.title}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.main>
        )}

        {view === 'albums' && (
          <motion.main 
            key="albums"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow w-full max-w-screen-2xl mx-auto px-6 md:px-12 py-16"
          >
            <div className="text-center mb-16">
              <span className="text-secondary font-label text-xs uppercase tracking-widest mb-4 block">Coleções Exclusivas</span>
              <h2 className="text-5xl font-headline font-bold text-primary mb-6 tracking-tight">Álbuns de Casamento</h2>
              <p className="max-w-2xl mx-auto text-on-surface-variant leading-relaxed">
                Cada história de amor é única. Escolha a base perfeita para as suas memórias mais preciosas, 
                produzida artesanalmente com os melhores materiais do mundo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
              {ALBUMS.map((album) => (
                <motion.div 
                  key={album.id}
                  whileHover={{ y: -10 }}
                  className="bg-white border border-outline-variant/10 overflow-hidden flex flex-col group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
                  onClick={() => handleSelectAlbum(album)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
                    <MiniFirstPage album={album} title={albumTexts['p1-title']} />
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur px-3 py-1 text-[10px] font-label uppercase tracking-widest text-primary shadow-sm">
                        {album.tag}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                      <button className="w-full bg-white text-primary py-3 font-label text-xs uppercase tracking-widest hover:bg-secondary hover:text-white transition-colors">
                        Personalizar Este Álbum
                      </button>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-headline font-bold text-primary">{album.name}</h3>
                      <span className="text-secondary font-bold">€{album.price.toFixed(0)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-6 line-clamp-2 leading-relaxed">
                      {album.description}
                    </p>
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60 uppercase tracking-tighter">
                        <Layers className="w-3 h-3" /> {album.specs.size}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60 uppercase tracking-tighter">
                        <Palette className="w-3 h-3" /> {album.specs.cover}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-outline-variant/10 pt-16">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-secondary">
                  <Camera className="w-6 h-6" />
                </div>
                <h4 className="font-headline font-bold text-primary">Qualidade Museu</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Impressão com pigmentos minerais que garantem a durabilidade das cores por gerações.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-secondary">
                  <Heart className="w-6 h-6" />
                </div>
                <h4 className="font-headline font-bold text-primary">Feito à Mão</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Cada álbum é costurado e montado manualmente pelos nossos mestres artesãos em Lisboa.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-secondary">
                  <Info className="w-6 h-6" />
                </div>
                <h4 className="font-headline font-bold text-primary">Design Assistido</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">O nosso editor inteligente ajuda-o a criar layouts equilibrados e esteticamente perfeitos.</p>
              </div>
            </div>
          </motion.main>
        )}

        {view === 'editor' && (
          <motion.main 
            key="editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-grow w-full max-w-screen-2xl mx-auto px-6 md:px-12 py-12 grid grid-cols-12 gap-8 lg:gap-16"
          >
            {/* Workspace (Left Column) */}
            <section className="col-span-12 lg:col-span-8 flex flex-col gap-12">
              {/* Header Section */}
              <div className="flex justify-between items-end border-b border-outline-variant/20 pb-8">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('albums')}
                    className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <span className="text-secondary font-label text-xs uppercase tracking-widest mb-1 block">A editar Layout</span>
                    <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">{selectedAlbum.name}</h1>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-on-surface-variant font-label text-sm uppercase">Página</span>
                  <div className="text-3xl font-headline text-primary">{currentPage.toString().padStart(2, '0')} <span className="text-on-surface-variant/40 text-xl italic">de {totalPages.toString().padStart(2, '0')}</span></div>
                </div>
              </div>

              {/* Page Spread */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 md:p-12 shadow-sm relative overflow-hidden aspect-[4/3] flex flex-col items-center justify-center border border-outline-variant/10"
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
                  <span className="font-headline text-[40rem] rotate-12 select-none" style={{ color: selectedAlbum.accentColor }}>J</span>
                </div>

                {/* Editorial Layout Grid */}
                <div className="w-full h-full z-10">
                  {currentPage === 1 && (
                    <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                      <div className="col-start-2 col-span-4 row-span-5 relative">
                        <Frame 
                          id={`p${currentPage}-f1`} 
                          className="w-full h-full" 
                          label="Página de Abertura" 
                          uploadedImages={uploadedImages}
                          selectedAlbum={selectedAlbum}
                          triggerUpload={triggerUpload}
                        />
                      </div>
                      <div className="col-start-2 col-span-4 row-span-1 flex items-center justify-center">
                        <EditableText 
                          value={albumTexts['p1-title']} 
                          onChange={(val) => handleTextChange('p1-title', val)}
                          maxLength={35}
                          isTitle={true}
                          className="text-3xl font-headline font-bold text-primary text-center tracking-tight"
                          placeholder="Título do Álbum"
                        />
                      </div>
                    </div>
                  )}

                  {currentPage === 2 && (
                    <div className="grid grid-cols-6 grid-rows-6 gap-4 md:gap-6 w-full h-full">
                      <Frame 
                        id={`p${currentPage}-f1`} 
                        className="col-span-3 row-span-6" 
                        label="Retrato Principal" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <Frame 
                        id={`p${currentPage}-f2`} 
                        className="col-span-3 row-span-3" 
                        label="Paisagem Superior" 
                        aspectRatio="landscape" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <Frame 
                        id={`p${currentPage}-f3`} 
                        className="col-span-1 row-span-3" 
                        label="Detalhe" 
                        aspectRatio="square" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <div className="col-span-2 row-span-3 p-4 flex flex-col justify-end">
                        <div className="h-px w-12 bg-secondary mb-4"></div>
                        <h3 className="text-lg font-headline italic text-primary leading-tight mb-2">Momentos</h3>
                        <EditableText 
                          value={albumTexts['p2-text']} 
                          onChange={(val) => handleTextChange('p2-text', val)}
                          className="text-[10px] font-body text-on-surface-variant/80"
                          placeholder="Uma breve nota sobre este dia especial."
                        />
                      </div>
                    </div>
                  )}

                  {currentPage === 3 && (
                    <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                      <Frame 
                        id={`p${currentPage}-f1`} 
                        className="col-span-3 row-span-6" 
                        label="Díptico Esquerdo" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <Frame 
                        id={`p${currentPage}-f2`} 
                        className="col-span-3 row-span-6" 
                        label="Díptico Direito" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                    </div>
                  )}

                  {currentPage === 4 && (
                    <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                      <Frame 
                        id={`p${currentPage}-f1`} 
                        className="col-span-6 row-span-4" 
                        label="Panorâmica Central" 
                        aspectRatio="landscape" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <div className="col-span-6 row-span-2 flex items-center justify-center text-center p-8">
                        <div className="max-w-md">
                          <h3 className="text-2xl font-headline italic text-primary mb-2">A Beleza do Detalhe</h3>
                          <EditableText 
                            value={albumTexts['p4-text']} 
                            onChange={(val) => handleTextChange('p4-text', val)}
                            className="text-xs font-body text-on-surface-variant/60 italic"
                            placeholder="Uma citação sobre felicidade ou união."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentPage === 5 && (
                    <div className="grid grid-cols-4 grid-rows-2 gap-4 w-full h-full">
                      <Frame 
                        id={`p${currentPage}-f1`} 
                        className="col-span-2 row-span-1" 
                        label="Grelha A" 
                        aspectRatio="square" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <Frame 
                        id={`p${currentPage}-f2`} 
                        className="col-span-2 row-span-1" 
                        label="Grelha B" 
                        aspectRatio="square" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <Frame 
                        id={`p${currentPage}-f3`} 
                        className="col-span-2 row-span-1" 
                        label="Grelha C" 
                        aspectRatio="square" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <Frame 
                        id={`p${currentPage}-f4`} 
                        className="col-span-2 row-span-1" 
                        label="Grelha D" 
                        aspectRatio="square" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                    </div>
                  )}

                  {currentPage === 6 && (
                    <div className="grid grid-cols-6 grid-rows-6 gap-6 w-full h-full">
                      <Frame 
                        id={`p${currentPage}-f1`} 
                        className="col-span-4 row-span-6" 
                        label="Destaque Final" 
                        uploadedImages={uploadedImages}
                        selectedAlbum={selectedAlbum}
                        triggerUpload={triggerUpload}
                      />
                      <div className="col-span-2 row-span-6 grid grid-rows-3 gap-4">
                        <Frame 
                          id={`p${currentPage}-f2`} 
                          className="row-span-1" 
                          label="Mini A" 
                          aspectRatio="square" 
                          uploadedImages={uploadedImages}
                          selectedAlbum={selectedAlbum}
                          triggerUpload={triggerUpload}
                        />
                        <Frame 
                          id={`p${currentPage}-f3`} 
                          className="row-span-1" 
                          label="Mini B" 
                          aspectRatio="square" 
                          uploadedImages={uploadedImages}
                          selectedAlbum={selectedAlbum}
                          triggerUpload={triggerUpload}
                        />
                        <div className="row-span-1 flex flex-col justify-end p-4 border-t border-outline-variant/20">
                          <span className="text-[8px] font-label uppercase tracking-widest text-secondary mb-2">Fim do Volume</span>
                          <EditableText 
                            value={albumTexts['p6-text']} 
                            onChange={(val) => handleTextChange('p6-text', val)}
                            className="text-sm font-headline italic text-primary"
                            placeholder="Memórias Eternas"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`w-12 h-12 flex items-center justify-center transition-colors ${currentPage === 1 ? 'text-primary/10 cursor-not-allowed' : 'text-primary/40 hover:text-secondary'}`}
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 flex items-center justify-center text-sm font-label transition-colors ${page === currentPage ? 'border-b-2 border-secondary text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`w-12 h-12 flex items-center justify-center transition-colors ${currentPage === totalPages ? 'text-primary/10 cursor-not-allowed' : 'text-primary hover:text-secondary'}`}
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </section>

            {/* Sidebar (Right Column) */}
            <aside className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              <div className="bg-surface-container-low p-8 flex flex-col gap-8 sticky top-32 editorial-shadow">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-primary mb-4">Resumo do Projeto</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline border-b border-outline-variant/10 pb-2">
                      <span className="text-[10px] font-label uppercase text-on-surface-variant">Série Selecionada</span>
                      <span className="text-sm font-body font-semibold">{selectedAlbum.name}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-outline-variant/10 pb-2">
                      <span className="text-[10px] font-label uppercase text-on-surface-variant">Tamanho</span>
                      <span className="text-sm font-body font-semibold">{selectedAlbum.specs.size}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-outline-variant/10 pb-2">
                      <span className="text-[10px] font-label uppercase text-on-surface-variant">Tipo de Papel</span>
                      <span className="text-sm font-body font-semibold">{selectedAlbum.specs.paper}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-outline-variant/10 pb-2">
                      <span className="text-[10px] font-label uppercase text-on-surface-variant">Páginas</span>
                      <span className="text-sm font-body font-semibold">12 Lâminas (24 Páginas)</span>
                    </div>
                  </div>
                </div>

                {/* Specimen Card */}
                <div className="bg-surface-container-highest p-6 relative group overflow-hidden border border-outline-variant/20">
                  <div className="absolute -top-4 -right-4 text-6xl font-headline text-primary/5 pointer-events-none select-none">V</div>
                  <h4 className="text-[10px] font-label uppercase tracking-widest text-secondary mb-4">Acabamento Atual</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary flex items-center justify-center" style={{ backgroundColor: selectedAlbum.accentColor }}>
                      <span className="text-white font-headline text-3xl">{selectedAlbum.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-headline italic text-primary">{selectedAlbum.specs.cover}</p>
                      <p className="text-[10px] font-label text-on-surface-variant uppercase">{selectedAlbum.specs.finish}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t-2 border-primary/5">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-label uppercase font-bold text-primary">Investimento Total</span>
                    <span className="text-2xl font-headline font-bold text-primary">€{selectedAlbum.price.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button className="bg-primary text-white py-4 font-label uppercase tracking-widest text-xs hover:opacity-95 transition-all">
                      Guardar Progresso
                    </button>
                    <button 
                      onClick={() => addToCart(selectedAlbum)}
                      className="bg-secondary text-white py-4 font-label uppercase tracking-widest text-xs hover:bg-[#5d4201] transition-all flex items-center justify-center gap-2"
                    >
                      Rever e Encomendar <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-body text-on-surface-variant/60 italic">Produzido artesanalmente com precisão em Vila do Conde.</p>
                </div>
              </div>
            </aside>
          </motion.main>
        )}

        {view === 'login' && (
          <motion.main 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow flex items-center justify-center py-24 bg-surface-container-low"
          >
            <div className="w-full max-w-md px-6">
              <div className="bg-white p-10 shadow-2xl border border-outline-variant/10 rounded-sm">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-headline font-bold text-primary">
                    {pendingCheckout ? 'Finalizar Encomenda' : 'Área de Cliente'}
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-2 uppercase tracking-widest">
                    {pendingCheckout ? 'Inicie sessão para concluir o seu pedido' : 'Inicie sessão para gerir os seus projetos'}
                  </p>
                </div>

                {pendingCheckout && (
                  <div className="mb-8 bg-secondary/10 border border-secondary/20 p-4 rounded-sm flex items-center gap-3 animate-pulse">
                    <Sparkles className="w-5 h-5 text-secondary shrink-0" />
                    <div className="flex-grow">
                      <p className="text-[11px] text-secondary font-bold uppercase tracking-wider leading-relaxed">
                        Quase lá! Inicie sessão para processarmos o seu carrinho imediatamente.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setPendingCheckout(false);
                        setIsCartOpen(true);
                        setView('editor');
                      }}
                      className="text-[9px] font-label uppercase tracking-widest text-primary hover:underline shrink-0"
                    >
                      Voltar ao Carrinho
                    </button>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                        placeholder="exemplo@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Palavra-passe</label>
                      <button type="button" className="text-[9px] font-label uppercase tracking-widest text-secondary hover:underline">Esqueceu-se?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border border-red-100 p-4 flex items-start gap-3">
                      <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 leading-relaxed">{loginError}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-white py-5 font-label text-xs uppercase tracking-widest hover:bg-secondary transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Entrar na Conta <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="mt-10 pt-8 border-t border-outline-variant/10 text-center">
                  <p className="text-xs text-on-surface-variant">
                    Ainda não é cliente? <button onClick={() => setView('register')} className="text-secondary font-bold hover:underline">Crie uma conta</button>
                  </p>
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {view === 'register' && (
          <motion.main 
            key="register"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow flex items-center justify-center py-24 bg-surface-container-low"
          >
            <div className="w-full max-w-2xl px-6">
              <div className="bg-white p-10 shadow-2xl border border-outline-variant/10 rounded-sm">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-headline font-bold text-primary">
                    {pendingCheckout ? 'Finalizar Encomenda' : 'Criar Conta'}
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-2 uppercase tracking-widest">
                    {pendingCheckout ? 'Registe-se para concluir o seu pedido' : 'Registe-se para começar os seus projetos'}
                  </p>
                </div>

                {pendingCheckout && (
                  <div className="mb-8 bg-secondary/10 border border-secondary/20 p-4 rounded-sm flex items-center gap-3 animate-pulse">
                    <Sparkles className="w-5 h-5 text-secondary shrink-0" />
                    <div className="flex-grow">
                      <p className="text-[11px] text-secondary font-bold uppercase tracking-wider leading-relaxed">
                        Crie a sua conta num minuto para finalizar a sua encomenda com segurança.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setPendingCheckout(false);
                        setIsCartOpen(true);
                        setView('editor');
                      }}
                      className="text-[9px] font-label uppercase tracking-widest text-primary hover:underline shrink-0"
                    >
                      Voltar ao Carrinho
                    </button>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Nome Completo</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                        <input 
                          type="text" 
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                          placeholder="O seu nome"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                          placeholder="exemplo@email.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Palavra-passe</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                        <input 
                          type="password" 
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">NIF</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                        <input 
                          type="text" 
                          required
                          value={nif}
                          onChange={(e) => setNif(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                          placeholder="Contribuinte"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Morada</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                        <input 
                          type="text" 
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                          placeholder="Rua, Número, Andar"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Código Postal</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                        <input 
                          type="text" 
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                          placeholder="0000-000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Localidade</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                        <input 
                          type="text" 
                          required
                          value={locality}
                          onChange={(e) => setLocality(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/30 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm"
                          placeholder="Cidade"
                        />
                      </div>
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border border-red-100 p-4 flex items-start gap-3">
                      <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 leading-relaxed">{loginError}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary text-white py-5 font-label text-xs uppercase tracking-widest hover:bg-secondary transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Criar Conta <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setView('login')}
                      className="w-full bg-surface border border-outline-variant/30 text-primary py-5 font-label text-xs uppercase tracking-widest hover:bg-surface-container transition-all flex items-center justify-center gap-3"
                    >
                      <ArrowLeft className="w-4 h-4" /> Já tenho conta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.main>
        )}

        {view === 'dashboard' && (
          <Dashboard 
            user={user}
            dashboardTab={dashboardTab}
            setDashboardTab={setDashboardTab}
            handleLogout={handleLogout}
            isOrdersLoading={isOrdersLoading}
            orders={orders}
            setView={setView}
            avatarUrl={avatarUrl}
            isUploadingAvatar={isUploadingAvatar}
            avatarInputRef={avatarInputRef}
            handleAvatarUpload={handleAvatarUpload}
          />
        )}
      </AnimatePresence>

      {/* BottomNavBar - Only visible in Editor */}
      {view === 'editor' && (
        <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center space-x-2 md:space-x-8 pb-8 pt-2 bg-primary/90 backdrop-blur-xl border-t border-white/10 shadow-2xl">
          <div className="flex items-center space-x-1 md:space-x-2">
            {[
              { icon: BookOpen, label: 'Capa' },
              { icon: FileText, label: 'Papel' },
              { icon: Palette, label: 'Tinta' },
              { icon: Book, label: 'Encadernação' },
              { icon: Sparkles, label: 'Acabamento', active: true },
              { icon: CheckCircle, label: 'Revisão' },
            ].map((item, idx) => (
              <div 
                key={idx}
                className={`flex flex-col items-center justify-center px-4 md:px-6 py-2 transition-all cursor-pointer ${item.active ? 'bg-secondary text-white rounded-sm scale-105 shadow-lg' : 'text-white/60 hover:bg-white/10'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[8px] md:text-[10px] uppercase font-semibold tracking-tight mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        </nav>
      )}

      {/* Footer */}
      <footer ref={footerRef} className="bg-surface-container-low w-full py-16 mt-20 mb-24 border-t border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-6 md:px-12 max-w-screen-2xl mx-auto">
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-8 h-8">
                <Image 
                  src={LOGO_URL} 
                  alt="Jungraf Logo" 
                  fill 
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-lg font-headline italic text-primary">Jungraf</span>
            </div>
            <p className="text-xs font-body text-on-surface-variant leading-relaxed mb-6">Excelência na Tipografia Portuguesa desde 1921. Dedicados à arte da página física.</p>
            
            {/* Google Maps Integration */}
            <div className="mt-8">
              <h5 className="font-label text-[10px] uppercase tracking-widest text-primary mb-4 font-bold">A nossa Morada</h5>
              <div className="h-48 w-full rounded-sm overflow-hidden border border-outline-variant/20 shadow-inner">
                {!hasValidKey ? (
                  <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center p-4 text-center">
                    <MapPin className="w-6 h-6 text-secondary mb-2" />
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Vila do Conde, Portugal</p>
                    <p className="text-[8px] mt-1 text-on-surface-variant/60">Rua Casal do Pedro, 1271</p>
                    <p className="text-[8px] text-on-surface-variant/60">4480-307 Vila do Conde</p>
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d9146.215604703315!2d-8.673961944315604!3d41.37455486805479!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd2444c81047e1cd%3A0x30e8fb165cdafd87!2sJungraf%20-%20Carlos%20Alberto%20Da%20Costa%20Ventura!5e0!3m2!1sen!2spt!4v1773922868366!5m2!1sen!2spt" 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                    <p className="text-[8px] mt-2 text-on-surface-variant/60">Configure a chave do Google Maps para ver o mapa interativo.</p>
                  </div>
                ) : (
                  <APIProvider apiKey={API_KEY} version="weekly">
                    <Map
                      defaultCenter={COMPANY_LOCATION}
                      defaultZoom={15}
                      mapId="JUNGRAF_MAP"
                      // @ts-ignore
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{width: '100%', height: '100%'}}
                      disableDefaultUI={true}
                    >
                      <AdvancedMarker position={COMPANY_LOCATION}>
                        <Pin background="#0047AB" glyphColor="#fff" />
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                )}
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-label text-xs uppercase tracking-widest text-primary mb-6 font-bold">Serviços</h5>
            <ul className="space-y-4">
              {services.map((s, i) => (
                <li key={i}>
                  <button 
                    onClick={() => {
                      setView(s.view);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-body text-on-surface-variant/60 hover:text-primary transition-colors text-left"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-label text-xs uppercase tracking-widest text-primary mb-6 font-bold">Suporte</h5>
            <ul className="space-y-4">
              <li><a className="text-xs font-body text-on-surface-variant/60 hover:text-primary transition-colors" href="#">Política de Privacidade</a></li>
              <li><a className="text-xs font-body text-on-surface-variant/60 hover:text-primary transition-colors" href="#">Termos de Serviço</a></li>
              <li><a className="text-xs font-body text-on-surface-variant/60 hover:text-primary transition-colors" href="#">Envios e Devoluções</a></li>
              <li><a className="text-xs font-body text-on-surface-variant/60 hover:text-primary transition-colors" href="#">Contacte-nos</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-label text-xs uppercase tracking-widest text-primary mb-6 font-bold">Newsletter</h5>
            <div className="relative">
              <input 
                className="w-full bg-transparent border-b border-outline-variant py-2 text-xs focus:outline-none focus:border-primary transition-colors" 
                placeholder="Endereço de Email" 
                type="email" 
              />
              <button className="absolute right-0 bottom-2">
                <ArrowRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-16 text-center border-t border-outline-variant/10 pt-8">
          <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">© 2026 Jungraf. Excelência na Tipografia Portuguesa.</p>
        </div>
      </footer>
      {/* Cart Drawer Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-headline font-bold text-primary">O Seu Carrinho</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-primary" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingBag className="w-16 h-16 text-on-surface-variant/10 mb-4" />
                    <p className="text-on-surface-variant font-body italic">O seu carrinho está vazio.</p>
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        setView('albums');
                      }}
                      className="mt-6 text-primary font-label text-[10px] uppercase tracking-widest border-b border-primary pb-1 hover:text-secondary hover:border-secondary transition-all"
                    >
                      Explorar Álbuns
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className="w-24 h-24 bg-surface-container-low relative overflow-hidden flex-shrink-0 border border-outline-variant/10">
                           <div className="absolute inset-0 flex items-center justify-center text-primary/20 font-headline text-2xl">
                             {item.name.charAt(0)}
                           </div>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <h4 className="font-headline font-bold text-primary">{item.name}</h4>
                            <button 
                              onClick={() => removeFromCart(idx)}
                              className="p-1 text-on-surface-variant/40 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[10px] font-label text-on-surface-variant uppercase mt-1">{item.specs.size} • {item.specs.paper}</p>
                          <p className="font-body font-bold text-primary mt-2">€{item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low/30">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-label uppercase font-bold text-primary">Total</span>
                    <span className="text-2xl font-headline font-bold text-primary">
                      €{cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={isOrdering || isGeneratingPDF}
                    className="w-full bg-primary text-white py-5 font-label text-xs uppercase tracking-widest hover:opacity-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isOrdering || isGeneratingPDF ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isGeneratingPDF ? 'A Gerar PDF...' : 'A Processar...'}
                      </>
                    ) : (
                      <>
                        Finalizar Encomenda <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[8px] text-center text-on-surface-variant/60 uppercase tracking-widest mt-4">
                    Pagamento seguro via Referência Multibanco ou MB Way
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

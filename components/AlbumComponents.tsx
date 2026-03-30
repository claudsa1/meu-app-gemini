import React, { useState } from 'react';
import { Edit3, Upload } from 'lucide-react';
import Image from 'next/image';

export interface AlbumProposal {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  price: number;
  specs: {
    size: string;
    paper: string;
    cover: string;
    finish: string;
  };
  accentColor: string;
  tag: string;
  placeholders: Record<string, string>;
}

export const ALBUMS: AlbumProposal[] = [
  {
    id: 'lisboa-vintage',
    name: 'Lisboa Vintage',
    description: 'Uma homenagem à tradição tipográfica portuguesa. Capa em linho natural com detalhes em dourado.',
    coverImage: 'https://images.unsplash.com/photo-1544144433-d50aff500b91?q=80&w=800&auto=format&fit=crop',
    price: 124.00,
    specs: {
      size: '30x30 cm Quadrado',
      paper: '250gsm Silk Texture',
      cover: 'Linho Azul Marinho',
      finish: 'Estampa Dourada a Quente'
    },
    accentColor: '#0047AB',
    tag: 'O Clássico',
    placeholders: {
      'p1-f1': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
      'p2-f1': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop',
      'p2-f2': 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop',
      'p2-f3': 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
      'p3-f1': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop',
      'p3-f2': 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop',
    }
  },
  {
    id: 'porto-moderno',
    name: 'Porto Moderno',
    description: 'Minimalismo contemporâneo com acabamento em pele premium e gravação a laser.',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
    price: 158.00,
    specs: {
      size: '25x35 cm Vertical',
      paper: '300gsm High Gloss',
      cover: 'Pele Genuína Preta',
      finish: 'Gravação a Laser Prateada'
    },
    accentColor: '#1b1c1c',
    tag: 'Minimalista',
    placeholders: {
      'p1-f1': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
      'p2-f1': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
      'p2-f2': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop',
      'p2-f3': 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop',
      'p3-f1': 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
      'p3-f2': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop',
    }
  },
  {
    id: 'algarve-sun',
    name: 'Algarve Sun',
    description: 'Tons quentes e materiais naturais. Capa em madeira de oliveira e papel de algodão.',
    coverImage: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
    price: 185.00,
    specs: {
      size: '40x30 cm Horizontal',
      paper: '200gsm Cotton Rag',
      cover: 'Madeira de Oliveira',
      finish: 'Dobradiças em Couro'
    },
    accentColor: '#775a19',
    tag: 'Orgânico',
    placeholders: {
      'p1-f1': 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
      'p2-f1': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop',
      'p2-f2': 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop',
      'p2-f3': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
      'p3-f1': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
      'p3-f2': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop',
    }
  },
  {
    id: 'douro-classic',
    name: 'Douro Classic',
    description: 'Elegância profunda com capa em veludo bordô e papel de bordas irregulares.',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
    price: 142.00,
    specs: {
      size: '30x30 cm Quadrado',
      paper: '250gsm Deckle Edge',
      cover: 'Veludo Bordô',
      finish: 'Bordado em Fio de Seda'
    },
    accentColor: '#350000',
    tag: 'Luxo',
    placeholders: {
      'p1-f1': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
      'p2-f1': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop',
      'p2-f2': 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop',
      'p2-f3': 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
      'p3-f1': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop',
      'p3-f2': 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop',
    }
  }
];

export const Frame = ({ 
  id, 
  className = '', 
  label = 'Adicionar Foto', 
  aspectRatio = 'portrait',
  uploadedImages,
  selectedAlbum,
  triggerUpload
}: { 
  id: string; 
  className?: string; 
  label?: string; 
  aspectRatio?: 'portrait' | 'landscape' | 'square';
  uploadedImages: Record<string, string>;
  selectedAlbum: AlbumProposal;
  triggerUpload: (id: string) => void;
}) => {
  const imageUrl = uploadedImages[id];
  const placeholderUrl = selectedAlbum.placeholders[id];
  
  return (
    <div className={`relative group ${className}`}>
      <div 
        onClick={() => triggerUpload(id)}
        className={`w-full h-full border-2 border-dashed border-outline-variant/30 rounded-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-secondary hover:bg-surface-container-low transition-all overflow-hidden relative ${
          aspectRatio === 'portrait' ? 'aspect-[3/4]' : 
          aspectRatio === 'landscape' ? 'aspect-[4/3]' : 'aspect-square'
        }`}
      >
        {imageUrl ? (
          <>
            <Image 
              src={imageUrl} 
              alt={label} 
              fill 
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </>
        ) : (
          <>
            {placeholderUrl && (
              <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity grayscale">
                <Image 
                  src={placeholderUrl} 
                  alt="Placeholder" 
                  fill 
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-container-low/80 backdrop-blur-sm flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-label uppercase tracking-wider text-secondary mb-1">{label}</p>
                <p className="text-[8px] text-on-surface-variant/60">Clique para carregar</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Frame Corner Accents */}
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 opacity-20" style={{ borderColor: selectedAlbum.accentColor }}></div>
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 opacity-20" style={{ borderColor: selectedAlbum.accentColor }}></div>
    </div>
  );
};

export const MiniFirstPage = ({ album, title }: { album: AlbumProposal, title?: string }) => {
  return (
    <div className="w-full h-full bg-white relative overflow-hidden flex flex-col items-center justify-center p-4 border border-outline-variant/5">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
        <span className="font-headline text-[10rem] rotate-12 select-none" style={{ color: album.accentColor }}>J</span>
      </div>
      
      <div className="w-full h-full z-10 grid grid-cols-6 grid-rows-6 gap-2">
        <div className="col-start-2 col-span-4 row-span-5 relative">
          <Image 
            src={album.placeholders['p1-f1']} 
            alt="Thumbnail" 
            fill 
            className="object-cover grayscale-[0.5] opacity-80"
            referrerPolicy="no-referrer"
          />
          {/* Corner accents */}
          <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l opacity-30" style={{ borderColor: album.accentColor }}></div>
          <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r opacity-30" style={{ borderColor: album.accentColor }}></div>
        </div>
        <div className="col-start-1 col-span-6 row-span-1 flex items-center justify-center">
          <span className="text-[8px] font-headline font-bold text-primary text-center truncate px-2">
            {title || 'O Nosso Casamento'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const EditableText = ({ 
  value, 
  onChange, 
  maxLength, 
  className = "", 
  placeholder = "Escreva aqui...",
  isTitle = false
}: { 
  value: string; 
  onChange: (val: string) => void; 
  maxLength?: number; 
  className?: string; 
  placeholder?: string;
  isTitle?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="relative w-full">
        {isTitle ? (
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className={`w-full bg-surface-container-low border border-secondary p-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary ${className}`}
            placeholder={placeholder}
          />
        ) : (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            onBlur={() => setIsEditing(false)}
            className={`w-full bg-surface-container-low border border-secondary p-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary resize-none ${className}`}
            rows={2}
            placeholder={placeholder}
          />
        )}
        {maxLength && (
          <div className="absolute -bottom-4 right-0 text-[8px] text-on-surface-variant/40">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`cursor-text hover:bg-surface-container-low/50 p-1 rounded-sm transition-colors group relative ${className}`}
    >
      {value || <span className="text-on-surface-variant/40 italic">{placeholder}</span>}
      <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-secondary transition-opacity" />
    </div>
  );
};


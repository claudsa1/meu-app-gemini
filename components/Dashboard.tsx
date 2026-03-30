import React from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  Upload, 
  User as UserIcon, 
  LogOut, 
  FileText, 
  Loader2, 
  ArrowRight,
  Camera
} from 'lucide-react';
import Image from 'next/image';

import { Order } from '@/lib/types';

interface DashboardProps {
  user: any;
  dashboardTab: 'orders' | 'upload' | 'profile';
  setDashboardTab: (tab: 'orders' | 'upload' | 'profile') => void;
  handleLogout: () => void;
  isOrdersLoading: boolean;
  orders: Order[];
  setView: (view: 'home' | 'about' | 'portfolio' | 'albums' | 'editor' | 'login' | 'register' | 'dashboard') => void;
  avatarUrl: string | null;
  isUploadingAvatar: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Dashboard = ({
  user,
  dashboardTab,
  setDashboardTab,
  handleLogout,
  isOrdersLoading,
  orders,
  setView,
  avatarUrl,
  isUploadingAvatar,
  avatarInputRef,
  handleAvatarUpload
}: DashboardProps) => {
  return (
    <motion.main 
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-grow py-24 bg-surface-container-low"
    >
      <div className="max-w-screen-xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar */}
          <aside className="w-full md:w-64 space-y-2">
            <div className="mb-8 p-6 bg-white border border-outline-variant/10 rounded-sm">
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <UserIcon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Cliente</p>
              <p className="text-sm font-bold text-primary truncate">{user?.email}</p>
            </div>

            {[
              { id: 'orders', label: 'As Minhas Encomendas', icon: ShoppingBag },
              { id: 'upload', label: 'Carregar Ficheiros', icon: Upload },
              { id: 'profile', label: 'O Meu Perfil', icon: UserIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDashboardTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-6 py-4 font-label text-[10px] uppercase tracking-widest transition-all rounded-sm ${dashboardTab === tab.id ? 'bg-primary text-white shadow-lg' : 'bg-white text-primary border border-outline-variant/5 hover:bg-surface-container'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-6 py-4 font-label text-[10px] uppercase tracking-widest text-red-600 bg-white border border-red-100 hover:bg-red-50 transition-all rounded-sm mt-8"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </aside>

          {/* Content */}
          <div className="flex-grow bg-white p-8 md:p-12 shadow-xl border border-outline-variant/10 rounded-sm min-h-[600px]">
            {dashboardTab === 'orders' && (
              <div className="space-y-8">
                <div className="flex justify-between items-end border-b border-outline-variant/10 pb-6">
                  <div>
                    <h2 className="text-3xl font-headline font-bold text-primary">Encomendas</h2>
                    <p className="text-xs text-on-surface-variant mt-2">Acompanhe o estado dos seus projetos.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setView('albums')}
                      className="bg-secondary text-white px-6 py-2 font-label text-[10px] uppercase tracking-widest hover:opacity-90 transition-all"
                    >
                      Nova Encomenda
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {isOrdersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                    </div>
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <div key={order["Order ID"]} className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-outline-variant/10 hover:border-secondary/30 transition-all group">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-surface-container flex items-center justify-center text-secondary">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">
                              {order["Order Number"]} • {new Date(order["Timestamp"]).toLocaleDateString('pt-PT')}
                            </p>
                            <h4 className="text-lg font-headline font-bold text-primary">{order["Item"]}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 mt-4 md:mt-0">
                          <div className="text-right">
                            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Preço</p>
                            <p className="font-bold text-primary">{order["Preço"]}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Estado</p>
                            <span className={`text-[9px] font-label uppercase tracking-widest px-3 py-1 rounded-full ${
                              order["Estado"] === 'Concluído' ? 'bg-green-100 text-green-700' : 
                              order["Estado"] === 'Enviado' ? 'bg-blue-100 text-blue-700' : 
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {order["Estado"]}
                            </span>
                          </div>
                          {order["PDF Link"] && (
                            <a 
                              href={order["PDF Link"]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-secondary hover:text-primary transition-colors flex flex-col items-center gap-1"
                              title="Ver PDF do Álbum"
                            >
                              <FileText className="w-5 h-5" />
                              <span className="text-[8px] font-label uppercase tracking-widest">PDF</span>
                            </a>
                          )}
                          <button className="p-2 text-on-surface-variant hover:text-secondary transition-colors">
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 border border-dashed border-outline-variant/20 rounded-sm">
                      <ShoppingBag className="w-12 h-12 text-on-surface-variant/20 mx-auto mb-4" />
                      <p className="text-sm text-on-surface-variant">Ainda não tem encomendas registadas.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {dashboardTab === 'upload' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-headline font-bold text-primary">Carregar Ficheiros</h2>
                  <p className="text-xs text-on-surface-variant mt-2">Envie os seus ficheiros para impressão ou gravação.</p>
                </div>

                <div className="border-2 border-dashed border-outline-variant/30 rounded-sm p-12 text-center hover:border-secondary/50 transition-all cursor-pointer bg-surface-container-low/30">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Upload className="w-8 h-8 text-secondary" />
                  </div>
                  <h4 className="text-xl font-headline font-bold text-primary mb-2">Arraste os seus ficheiros aqui</h4>
                  <p className="text-xs text-on-surface-variant mb-8">Formatos suportados: PDF, AI, PSD, JPG (Máx 50MB)</p>
                  <button className="bg-primary text-white px-8 py-4 font-label text-xs uppercase tracking-widest hover:bg-secondary transition-all">
                    Selecionar do Computador
                  </button>
                </div>

                <div className="mt-12">
                  <h5 className="font-label text-[10px] uppercase tracking-widest text-primary mb-4 font-bold">Ficheiros Recentes</h5>
                  <div className="space-y-2">
                    {[
                      { name: 'logotipo_vetorial.ai', size: '2.4 MB', date: 'Hoje' },
                      { name: 'foto_capa_album.jpg', size: '12.8 MB', date: 'Ontem' },
                    ].map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-sm">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-on-surface-variant" />
                          <span className="text-xs text-primary font-medium">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="text-[10px] text-on-surface-variant">{file.size}</span>
                          <span className="text-[10px] text-on-surface-variant">{file.date}</span>
                          <button className="text-red-600 hover:text-red-700">
                            <LogOut className="w-3 h-3 rotate-90" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === 'profile' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                  {/* Avatar Column */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-32 h-32 bg-surface-container rounded-full overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
                        {avatarUrl ? (
                          <Image 
                            src={avatarUrl} 
                            alt="Avatar" 
                            fill 
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <UserIcon className="w-12 h-12 text-on-surface-variant/30" />
                        )}
                        
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-secondary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input 
                        type="file" 
                        ref={avatarInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-primary">Foto de Perfil</h3>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">JPG ou PNG, Máx 2MB</p>
                    </div>
                  </div>

                  {/* Form Column */}
                  <div className="flex-grow space-y-8">
                    <div>
                      <h2 className="text-3xl font-headline font-bold text-primary">O Meu Perfil</h2>
                      <p className="text-xs text-on-surface-variant mt-2">Gira as suas informações de contacto e faturação.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Nome Completo</label>
                          <input type="text" className="w-full bg-surface border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm" defaultValue={user?.user_metadata?.full_name || ''} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Email</label>
                          <input type="email" className="w-full bg-surface border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm" defaultValue={user?.email || ''} disabled />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">NIF</label>
                          <input type="text" className="w-full bg-surface border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm" defaultValue={user?.user_metadata?.nif || ''} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Morada</label>
                          <input type="text" className="w-full bg-surface border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm" defaultValue={user?.user_metadata?.address || ''} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Cód. Postal</label>
                            <input type="text" className="w-full bg-surface border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm" defaultValue={user?.user_metadata?.postal_code || ''} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Localidade</label>
                            <input type="text" className="w-full bg-surface border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm" defaultValue={user?.user_metadata?.locality || ''} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant ml-1">Telefone</label>
                          <input type="tel" className="w-full bg-surface border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors rounded-sm" defaultValue={user?.user_metadata?.phone || ''} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-outline-variant/10">
                      <button className="bg-primary text-white px-10 py-4 font-label text-xs uppercase tracking-widest hover:bg-secondary transition-all shadow-lg">
                        Guardar Alterações
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.main>
  );
};

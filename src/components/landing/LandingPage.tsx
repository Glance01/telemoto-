import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bike,
  ShieldCheck,
  CreditCard,
  Smartphone,
  MapPin,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  Navigation,
  CheckCircle,
  Users,
  Star,
  Zap,
  ArrowRight,
  HeartHandshake,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Package,
  Compass,
  Check,
  HelpCircle,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import safeTripBanner from '../../assets/images/safe_trip_banner_1790433106044.jpg';

interface LandingPageProps {
  onStartRide: () => void;
  onBeDriver: () => void;
}

interface SimulatedRoute {
  name: string;
  from: string;
  to: string;
  distanceKm: number;
  motoMinutes: number;
  carMinutes: number;
  fairPriceMT: number;
  trafficHotspot: string;
}

const POPULAR_SIMULATED_ROUTES: SimulatedRoute[] = [
  {
    name: 'Inhambane ➔ Praia do Tofo',
    from: 'Mercado Central de Inhambane',
    to: 'Praia do Tofo',
    distanceKm: 22.5,
    motoMinutes: 25,
    carMinutes: 55,
    fairPriceMT: 220,
    trafficHotspot: 'Viagem expressa e direta sem esperar encher o chapa na paragem',
  },
  {
    name: 'Maxixe ➔ EN1',
    from: 'Cais da Maxixe',
    to: 'Rotunda da EN1',
    distanceKm: 3.8,
    motoMinutes: 8,
    carMinutes: 22,
    fairPriceMT: 60,
    trafficHotspot: 'Ligação expressa da lancha para a estrada nacional',
  },
  {
    name: 'Vilankulo ➔ Praia',
    from: 'Mercado Municipal',
    to: 'Zona Hoteleira',
    distanceKm: 4.5,
    motoMinutes: 9,
    carMinutes: 25,
    fairPriceMT: 70,
    trafficHotspot: 'Trânsito livre direto para a orla marítima',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({ onStartRide, onBeDriver }) => {
  return (
    <div className="bg-white dark:bg-neutral-950 min-h-screen text-neutral-900 dark:text-neutral-100 font-sans selection:bg-red-500 selection:text-white overflow-x-hidden">
      {/* HERO SECTION - iOS 26 Aesthetic */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-16 px-4">
        {/* Background Decorative Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 dark:bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          className="max-w-7xl mx-auto w-full relative z-10"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 ios-glass rounded-full text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 shadow-sm border border-neutral-200/50 dark:border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span>Exclusivo para Moçambique 🇲🇿</span>
              </motion.div>

              <motion.h1 
                variants={itemVariants}
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-neutral-950 dark:text-white"
              >
                Esquiva o Trânsito. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-500">
                  Chega a Horas.
                </span>
              </motion.h1>

              <motion.p 
                variants={itemVariants}
                className="text-lg md:text-xl text-neutral-500 dark:text-neutral-400 max-w-xl font-medium leading-relaxed"
              >
                A mobilidade inteligente que Moçambique precisava. Preço negociado na hora, condutores certificados e pagamento em mão.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={onStartRide}
                  className="px-10 py-5 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Pedir Moto Agora</span>
                </button>

                <button
                  onClick={onBeDriver}
                  className="px-10 py-5 ios-glass border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-white/90 dark:hover:bg-neutral-900 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl"
                >
                  <Bike className="w-5 h-5 text-red-500" />
                  <span>Ser Condutor</span>
                </button>
              </motion.div>

              {/* Trust Section */}
              <motion.div variants={itemVariants} className="pt-10 flex items-center gap-8 border-t border-neutral-200 dark:border-white/5">
                <div className="space-y-1">
                  <div className="text-2xl font-black text-neutral-900 dark:text-white">+50k</div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Viagens Realizadas</div>
                </div>
                <div className="w-px h-8 bg-neutral-200 dark:bg-white/10" />
                <div className="space-y-1">
                  <div className="text-2xl font-black text-neutral-900 dark:text-white">4.9/5</div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avaliação Média</div>
                </div>
                <div className="w-px h-8 bg-neutral-200 dark:bg-white/10" />
                <div className="space-y-1">
                  <div className="text-2xl font-black text-neutral-900 dark:text-white">~3min</div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tempo de Espera</div>
                </div>
              </motion.div>
            </div>

            {/* Right Visual Container */}
            <motion.div 
              variants={itemVariants}
              className="relative hidden lg:block"
            >
              <div className="relative z-20 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] border-white dark:border-neutral-900 transform rotate-3">
                <img 
                  src={safeTripBanner} 
                  alt="TeleMoto+" 
                  className="w-full aspect-[4/5] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8">
                  <div className="ios-glass-dark p-6 rounded-3xl space-y-3 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">Tecnologia Local</span>
                    </div>
                    <h4 className="text-white font-black text-xl leading-tight">O motor de Moçambique.</h4>
                  </div>
                </div>
              </div>
              
              {/* Floating Element 1 */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 -left-10 z-30 ios-glass p-4 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-neutral-400 uppercase">Segurança</div>
                    <div className="text-xs font-black text-neutral-900 dark:text-white tracking-tight">Monitorizado 24/7</div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Element 2 */}
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-10 -right-10 z-30 ios-glass p-4 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-neutral-400 uppercase">Pagamento</div>
                    <div className="text-xs font-black text-neutral-900 dark:text-white tracking-tight">Dinheiro Vivo</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ROUTES SECTION - Elegant Grid */}
      <section className="py-32 px-4 bg-neutral-50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-950 dark:text-white">
              Trajetos Populares
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto font-medium">
              Economize tempo real. Veja a vantagem da TeleMoto+.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {POPULAR_SIMULATED_ROUTES.map((route, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="ios-glass p-8 rounded-[2rem] border border-neutral-200 dark:border-white/5 shadow-sm space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-neutral-950 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-neutral-950">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                    {route.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-400 uppercase tracking-widest">Distância</span>
                      <span className="text-neutral-900 dark:text-white">{route.distanceKm} km</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-400 uppercase tracking-widest">Tempo Moto</span>
                      <span className="text-red-600 font-mono text-base">{route.motoMinutes} min</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onStartRide}
                  className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Consultar Tarifa
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Immersive Steps */}
      <section className="py-32 px-4">
        <div className="max-w-5xl mx-auto space-y-24">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-950 dark:text-white uppercase italic">
              Simples. Rápido. Seguro.
            </h2>
          </div>

          <div className="space-y-32">
            {/* Step 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="text-6xl font-black text-neutral-100 dark:text-neutral-900">01</div>
                <h3 className="text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
                  Chama no App
                </h3>
                <p className="text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                  Indique o seu destino e veja os condutores à sua volta em tempo real.
                </p>
              </div>
              <div className="ios-glass p-12 rounded-[3rem] border border-neutral-200 dark:border-white/5 shadow-2xl aspect-square flex items-center justify-center">
                <MapPin className="w-32 h-32 text-red-600" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="ios-glass p-12 rounded-[3rem] border border-neutral-200 dark:border-white/5 shadow-2xl aspect-square flex items-center justify-center order-2 md:order-1">
                <Zap className="w-32 h-32 text-amber-500" />
              </div>
              <div className="space-y-6 order-1 md:order-2">
                <div className="text-6xl font-black text-neutral-100 dark:text-neutral-900">02</div>
                <h3 className="text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
                  Acorda o Preço
                </h3>
                <p className="text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                  Sem algoritmos. Você e o condutor acordam uma tarifa justa. Transparência total.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="text-6xl font-black text-neutral-100 dark:text-neutral-900">03</div>
                <h3 className="text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
                  Paga ao Chegar
                </h3>
                <p className="text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                  Ao chegar ao destino, pague o valor combinado diretamente em dinheiro vivo.
                </p>
              </div>
              <div className="ios-glass p-12 rounded-[3rem] border border-neutral-200 dark:border-white/5 shadow-2xl aspect-square flex items-center justify-center">
                <CheckCircle className="w-32 h-32 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION - Final */}
      <section className="py-32 px-4 text-center">
        <motion.div 
          whileInView={{ scale: [0.95, 1], opacity: [0, 1] }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto ios-glass p-16 md:p-24 rounded-[4rem] border border-neutral-200 dark:border-white/5 shadow-2xl space-y-10"
        >
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-neutral-950 dark:text-white">
            Pronto para <br /> a primeira viagem?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onStartRide}
              className="px-12 py-6 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
            >
              Pedir Moto Agora
            </button>
            <button
              onClick={onBeDriver}
              className="px-12 py-6 bg-neutral-900 dark:bg-neutral-800 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-all active:scale-95 cursor-pointer"
            >
              Registar Como Condutor
            </button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 px-4 border-t border-neutral-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Bike className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter text-neutral-950 dark:text-white uppercase italic">TeleMoto+</span>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-neutral-400">
            <a href="#" className="hover:text-red-600 transition-colors">Termos</a>
            <a href="#" className="hover:text-red-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-red-600 transition-colors">Suporte</a>
          </div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            © 2026 TeleMoto+ Moçambique.
          </div>
        </div>
      </footer>
    </div>
  );
};

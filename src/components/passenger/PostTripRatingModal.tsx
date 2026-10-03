import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip } from '../../types';
import { submitRating } from '../../services/rideService';
import {
  Star,
  CheckCircle2,
  Bike,
  ShieldCheck,
  MapPin,
  MessageSquare,
  ThumbsUp,
  Heart,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';

interface PostTripRatingModalProps {
  trip: Trip;
  onClose: () => void;
  currentUserId: string;
}

const QUICK_TAGS = [
  'Condução Segura 🛡️',
  'Mota Limpa 🏍️',
  'Bom Atendimento 💬',
  'Muito Pontual ⏱️',
  'Educado e Respeitoso 👍',
  'Conhece bem os Atalhos 🗺️',
];

const STAR_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Muito Fraco 😞', color: 'text-red-500' },
  2: { text: 'Razoável 😐', color: 'text-amber-500' },
  3: { text: 'Bom 🙂', color: 'text-yellow-600' },
  4: { text: 'Muito Bom! 😊', color: 'text-emerald-600' },
  5: { text: 'Excelente / Impecável! 🌟', color: 'text-red-500' },
};

export const PostTripRatingModal: React.FC<PostTripRatingModalProps> = ({
  trip,
  onClose,
  currentUserId,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const activeStar = hoveredRating || rating;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !trip.driverId) return;

    setSubmitting(true);
    try {
      const fullComment = [
        selectedTags.length > 0 ? selectedTags.join(', ') : '',
        comment.trim(),
      ]
        .filter(Boolean)
        .join(' — ');

      await submitRating({
        tripId: trip.id,
        fromUserId: currentUserId,
        toUserId: trip.driverId,
        fromRole: 'passenger',
        toRole: 'driver',
        score: rating,
        comment: fullComment,
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="ios-glass dark:bg-neutral-900/90 max-w-md w-full p-8 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] relative border border-white/20 dark:border-white/5 max-h-[92vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-full ios-glass hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 space-y-4"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Avaliação Registada!</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                Muito obrigado! O teu feedback ajuda a manter o TeleMoto+ excelente para todos em Moçambique.
              </p>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit} 
              className="space-y-8"
            >
              {/* Header with Driver info */}
              <div className="text-center space-y-4">
                <div className="relative inline-block group">
                  <div className="w-24 h-24 rounded-full overflow-hidden ios-glass border-4 border-red-500 mx-auto shadow-xl flex items-center justify-center text-neutral-700 font-black text-3xl">
                    {trip.driverPhoto ? (
                      <img
                        src={trip.driverPhoto}
                        alt={trip.driverName || 'Condutor'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <span>{trip.driverName?.[0]?.toUpperCase() || 'M'}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-2 bg-red-600 text-white rounded-full shadow-lg border-2 border-white dark:border-neutral-900">
                    <Bike className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                    Sua Experiência
                  </span>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Como foi a viagem com {trip.driverName?.split(' ')[0]}?
                  </h3>
                </div>
              </div>

              {/* Star Rating Section */}
              <div className="bg-neutral-100/50 dark:bg-white/5 rounded-[2rem] p-6 text-center space-y-4 border border-neutral-200 dark:border-white/5">
                <div className="flex justify-center items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      type="button"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-10 h-10 transition-all ${
                          star <= activeStar
                            ? 'fill-amber-400 text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                            : 'text-neutral-300 dark:text-neutral-700'
                        }`}
                      />
                    </motion.button>
                  ))}
                </div>

                <motion.p 
                  key={activeStar}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs font-black tracking-widest uppercase ${STAR_LABELS[activeStar]?.color || 'text-neutral-600'}`}
                >
                  {STAR_LABELS[activeStar]?.text}
                </motion.p>
              </div>

              {/* Quick Tags */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                  O que correu melhor?
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <motion.button
                        key={tag}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-tighter border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-lg'
                            : 'ios-glass text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10'
                        }`}
                      >
                        {tag}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_20px_40px_-10px_rgba(220,38,38,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  <span>Submeter Avaliação</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 bg-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Fazer depois
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

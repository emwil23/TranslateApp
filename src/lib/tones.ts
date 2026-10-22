import { Briefcase, Coffee, Mail, MessageCircle, Minus, Smile, type LucideIcon } from 'lucide-react'

export type Tone = 'plain' | 'formal' | 'casual' | 'friendly' | 'whatsapp' | 'email'

export const TONES: { id: Tone; label: string; hi: string; icon: LucideIcon; hint: string }[] = [
  {
    id: 'plain',
    label: 'Plain',
    hi: 'सीधा',
    icon: Minus,
    hint: 'A faithful translation, nothing added',
  },
  {
    id: 'formal',
    label: 'Formal',
    hi: 'औपचारिक',
    icon: Briefcase,
    hint: 'Polite and correct, for official use',
  },
  { id: 'casual', label: 'Casual', hi: 'आम', icon: Coffee, hint: 'Relaxed, the way people talk' },
  { id: 'friendly', label: 'Friendly', hi: 'दोस्ताना', icon: Smile, hint: 'Warm and kind' },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    hi: 'व्हाट्सऐप',
    icon: MessageCircle,
    hint: 'Short chat style, a fitting emoji or two',
  },
  {
    id: 'email',
    label: 'Business email',
    hi: 'बिज़नेस ईमेल',
    icon: Mail,
    hint: 'Clear, professional, ready to send',
  },
]

/** Plain translations can run on the device; every other tone needs AI. */
export const needsAi = (tone: Tone, respect?: string) => tone !== 'plain' || Boolean(respect)

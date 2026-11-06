import type { Customer, Rsvp } from '../types/database';

export const DEMO_CUSTOMER: Customer = {
  id: 'ecc9883b-3e02-4149-95fd-demo-romeo-juliet',
  slug: 'romeo-juliet',
  couple_names: 'Romeo & Juliet',
  event_date: '2026-11-28',
  owner_id: 'demo-user-romeo-juliet',
};

export const DEMO_ROMEO_JULIET_RSVPS: Rsvp[] = [
  {
    id: 'demo-1',
    customer_id: 'ecc9883b-3e02-4149-95fd-demo-romeo-juliet',
    name: 'Rian Pratama & Anisa Rahma',
    attendance: 'hadir',
    guests: 2,
    message: 'Selamat menempuh hidup baru Romeo & Juliet! Semoga selalu rukun, bahagia, dan penuh berkah.',
    guest_param: 'Rian Pratama',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-2',
    customer_id: 'ecc9883b-3e02-4149-95fd-demo-romeo-juliet',
    name: 'Dimas Setiawan & Nadia Putri',
    attendance: 'hadir',
    guests: 2,
    message: 'Happy wedding Romeo & Juliet! Doa terbaik untuk kalian berdua, semoga langgeng sampai tua ya.',
    guest_param: 'Dimas Setiawan',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

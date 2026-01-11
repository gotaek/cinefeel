
import React from 'react';
import HomeClient from './HomeClient';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Event } from '@/types';

// Force dynamic rendering for always-fresh data, or use revalidate
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function Home() {
  let events: Event[] = [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          cinemas (name)
        `);

      if (error) {
        console.error('Supabase fetch error:', error);
      } else if (data && data.length > 0) {
        // Transform Supabase data to match Event interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events = data.map((item: any) => ({
          id: item.id,
          title: item.event_title || item.title || 'Untitled Event',
          cinema: item.cinemas?.name || 'Unknown',
          goodsType: item.goods_type || 'Unknown',
          period: item.period || '',
          imageUrl: item.image_url || '',
          locations: item.locations || [],
          officialUrl: item.official_url || '',
          status: item.status || '진행중'
        }));
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }

  return (
    <HomeClient initialEvents={events} />
  );
}

'use client';
// components/admin/AdminSettingsClient.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import type { StoreSettings } from '@/types';

const AdminHQMap = dynamic(() => import('@/components/map/AdminHQMap'), { ssr: false });

interface Props { initialSettings: StoreSettings | null }

export default function AdminSettingsClient({ initialSettings }: Props) {
  const defaults = {
    hq_lat: 6.9271, hq_lng: 79.8612, hq_address: '',
    base_delivery_rate: 300, base_distance_km: 5, rate_per_additional_km: 50,
    store_name: 'Chrish Flora', store_phone: '', store_email: '',
    branches: [] as any[],
  };
  const init = initialSettings || defaults;

  const [form, setForm] = useState({
    hq_lat: init.hq_lat,
    hq_lng: init.hq_lng,
    hq_address: init.hq_address || '',
    base_delivery_rate: init.base_delivery_rate,
    base_distance_km: init.base_distance_km,
    rate_per_additional_km: init.rate_per_additional_km,
    store_name: init.store_name || 'Chrish Flora',
    store_phone: init.store_phone || '',
    store_email: init.store_email || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleMapClick = (lat: number, lng: number) => {
    setForm(p => ({ ...p, hq_lat: lat, hq_lng: lng }));
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      if (initialSettings?.id) {
        const { error: err } = await supabase
          .from('store_settings')
          .update({ ...form, branches: initialSettings.branches || [] })
          .eq('id', initialSettings.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('store_settings')
          .insert({ ...form, branches: [] });
        if (err) throw err;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value }));

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-serif text-3xl text-flora-brown">Store Settings</h1>

      {/* Store Info */}
      <section className="bg-white border border-gray-100 shadow-sm p-6">
        <h2 className="font-serif text-xl text-flora-brown mb-5">Store Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Store Name</label>
            <input className="input" value={form.store_name} onChange={f('store_name')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.store_phone} onChange={f('store_phone')} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Email</label>
            <input type="email" className="input" value={form.store_email} onChange={f('store_email')} />
          </div>
        </div>
      </section>

      {/* HQ Location */}
      <section className="bg-white border border-gray-100 shadow-sm p-6">
        <h2 className="font-serif text-xl text-flora-brown mb-2">HQ Dispatch Location</h2>
        <p className="text-sm font-sans text-gray-400 mb-4">
          Click on the map to set your store's dispatch origin coordinates.
        </p>
        <div className="border border-gray-200 overflow-hidden mb-4">
          <AdminHQMap lat={form.hq_lat} lng={form.hq_lng} onChange={handleMapClick} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Latitude</label>
            <input type="number" step="any" className="input tabular" value={form.hq_lat} onChange={f('hq_lat')} />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input type="number" step="any" className="input tabular" value={form.hq_lng} onChange={f('hq_lng')} />
          </div>
          <div className="col-span-2">
            <label className="label">HQ Address</label>
            <input className="input" value={form.hq_address} onChange={f('hq_address')} />
          </div>
        </div>
      </section>

      {/* Delivery Pricing Matrix */}
      <section className="bg-white border border-gray-100 shadow-sm p-6">
        <h2 className="font-serif text-xl text-flora-brown mb-2">Delivery Pricing Matrix</h2>
        <p className="text-sm font-sans text-gray-400 mb-4">
          Formula: <span className="font-mono text-xs bg-gray-100 px-2 py-0.5">
            Charge = Base Rate + (distance − Base KM) × Rate per KM
          </span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Base Delivery Rate (LKR)</label>
            <input type="number" className="input tabular" value={form.base_delivery_rate} onChange={f('base_delivery_rate')} />
            <p className="text-xs text-gray-400 mt-1">Flat rate up to base distance</p>
          </div>
          <div>
            <label className="label">Base Distance (km)</label>
            <input type="number" className="input tabular" value={form.base_distance_km} onChange={f('base_distance_km')} />
            <p className="text-xs text-gray-400 mt-1">Free additional km included</p>
          </div>
          <div>
            <label className="label">Rate per Additional KM (LKR)</label>
            <input type="number" className="input tabular" value={form.rate_per_additional_km} onChange={f('rate_per_additional_km')} />
            <p className="text-xs text-gray-400 mt-1">Beyond base distance</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4">{error}</div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4">
          ✓ Settings saved successfully.
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="btn-gold px-8">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

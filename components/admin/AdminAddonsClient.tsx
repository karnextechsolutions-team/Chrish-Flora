'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Camera, X, Sparkles, Loader2 } from 'lucide-react';
import type { ProductAddon } from '@/types';

interface Props {
  initialAddons: ProductAddon[];
}

const ADDON_TYPES = [
  { value: 'wrapping_paper', label: 'Wrapping Paper' },
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'card', label: 'Message Card' },
  { value: 'vase', label: 'Vase' },
  { value: 'other', label: 'Other Extra' },
];

const INITIAL_FORM = {
  name: '',
  description: '',
  type: 'wrapping_paper' as ProductAddon['type'],
  price: 0,
  image_url: '' as string | null,
  color_hex: '' as string | null,
  is_active: true,
  is_in_stock: true,
  sort_order: 0,
};

export default function AdminAddonsClient({ initialAddons }: Props) {
  const [addons, setAddons] = useState<ProductAddon[]>(initialAddons);
  const [showForm, setShowForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ProductAddon | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [hasColor, setHasColor] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Filtered lists
  const wrappingPapers = addons.filter(a => a.type === 'wrapping_paper');
  const otherAddons = addons.filter(a => a.type !== 'wrapping_paper');

  const handleToggleActive = async (id: string, current: boolean) => {
    const nextVal = !current;
    // Optimistic update
    setAddons(prev => prev.map(a => a.id === id ? { ...a, is_active: nextVal } : a));
    
    const { error: err } = await supabase
      .from('product_addons')
      .update({ is_active: nextVal })
      .eq('id', id);
      
    if (err) {
      // Revert on error
      setAddons(prev => prev.map(a => a.id === id ? { ...a, is_active: current } : a));
      alert(`Failed to update active state: ${err.message}`);
    }
  };

  const handleToggleStock = async (id: string, current: boolean) => {
    const nextVal = !current;
    // Optimistic update
    setAddons(prev => prev.map(a => a.id === id ? { ...a, is_in_stock: nextVal } : a));
    
    const { error: err } = await supabase
      .from('product_addons')
      .update({ is_in_stock: nextVal })
      .eq('id', id);
      
    if (err) {
      // Revert on error
      setAddons(prev => prev.map(a => a.id === id ? { ...a, is_in_stock: current } : a));
      alert(`Failed to update stock state: ${err.message}`);
    }
  };

  const handleOpenAdd = () => {
    setEditingAddon(null);
    setForm(INITIAL_FORM);
    setHasColor(false);
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (addon: ProductAddon) => {
    setEditingAddon(addon);
    setForm({
      name: addon.name,
      description: addon.description || '',
      type: addon.type,
      price: addon.price,
      image_url: addon.image_url,
      color_hex: addon.color_hex,
      is_active: addon.is_active,
      is_in_stock: addon.is_in_stock,
      sort_order: addon.sort_order,
    });
    setHasColor(!!addon.color_hex);
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this addon? This action cannot be undone.')) {
      return;
    }
    const { error: err } = await supabase
      .from('product_addons')
      .delete()
      .eq('id', id);

    if (err) {
      alert(`Error deleting addon: ${err.message}`);
    } else {
      setAddons(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    if (file.size > 3 * 1024 * 1024) {
      setError('File is too large. Max 3MB.');
      return;
    }
    
    setUploading(true);
    setError('');
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `addons/${fileName}`;

      const { data, error: uploadErr } = await supabase.storage
        .from('addon-images')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from('addon-images')
        .getPublicUrl(filePath);

      if (publicUrlData) {
        setForm(prev => ({ ...prev, image_url: publicUrlData.publicUrl }));
      }
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (form.price < 0) {
      setError('Price cannot be negative');
      return;
    }
    
    setSaving(true);
    setError('');
    
    const payload = {
      ...form,
      color_hex: hasColor ? (form.color_hex || '#C9962A') : null,
    };

    try {
      if (editingAddon) {
        // Update
        const { data, error: updateErr } = await supabase
          .from('product_addons')
          .update(payload)
          .eq('id', editingAddon.id)
          .select()
          .single();
          
        if (updateErr) throw updateErr;
        
        setAddons(prev => prev.map(a => a.id === editingAddon.id ? data : a));
      } else {
        // Create
        const { data, error: insertErr } = await supabase
          .from('product_addons')
          .insert(payload)
          .select()
          .single();
          
        if (insertErr) throw insertErr;
        
        setAddons(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      }
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save addon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="font-serif text-3xl text-flora-brown flex items-center gap-2">
            <Sparkles className="text-gold-600" size={28} />
            Product Add-ons
          </h1>
          <p className="text-sm font-sans text-flora-brown/50 mt-1">
            Manage custom wrapping papers, ribbons, cards, and extras for bouquets
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm font-semibold rounded-xl"
        >
          <Plus size={16} />
          Add New Add-on
        </button>
      </div>

      {/* Wrapping Papers Section */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl text-flora-brown border-l-4 border-gold-600 pl-3">
          Wrapping Papers
        </h2>
        {wrappingPapers.length === 0 ? (
          <p className="text-sm text-flora-brown/40 font-sans italic">No wrapping papers created yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {wrappingPapers.map(addon => (
              <AddonCard
                key={addon.id}
                addon={addon}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onToggleStock={handleToggleStock}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ribbons & Extras Section */}
      <div className="space-y-4 pt-6 border-t border-gray-100">
        <h2 className="font-serif text-xl text-flora-brown border-l-4 border-olive-200 pl-3">
          Ribbons & Extras
        </h2>
        {otherAddons.length === 0 ? (
          <p className="text-sm text-flora-brown/40 font-sans italic">No ribbons or extras created yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {otherAddons.map(addon => (
              <AddonCard
                key={addon.id}
                addon={addon}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onToggleStock={handleToggleStock}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] shadow-2xl p-6 flex flex-col overflow-hidden md:rounded-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-gray-50 pb-4">
              <h2 className="font-serif text-2xl text-flora-brown">
                {editingAddon ? 'Edit Add-on' : 'New Add-on'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-6 scroll-touch pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Form Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="label text-xs font-bold uppercase tracking-wider text-flora-brown/70 block mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Kraft Brown Wrap"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label text-xs font-bold uppercase tracking-wider text-flora-brown/70 block mb-1.5">
                      Type *
                    </label>
                    <select
                      value={form.type}
                      onChange={e => setForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="input cursor-pointer"
                    >
                      {ADDON_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-xs font-bold uppercase tracking-wider text-flora-brown/70 block mb-1.5">
                      Price (LKR) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={form.price || ''}
                      onChange={e => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      placeholder="150"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label text-xs font-bold uppercase tracking-wider text-flora-brown/70 block mb-1.5">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={e => setForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                      className="input"
                    />
                  </div>
                </div>

                {/* Right Form Inputs */}
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <label className="label text-xs font-bold uppercase tracking-wider text-flora-brown/70 block mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Short details about this add-on..."
                      className="input resize-none"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="label text-xs font-bold uppercase tracking-wider text-flora-brown/70 block mb-1.5">
                      Add-on Image
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-18 h-18 bg-gray-50 border border-dashed border-gray-300 rounded-xl overflow-hidden flex items-center justify-center shrink-0 w-[72px] h-[72px]">
                        {form.image_url ? (
                          <Image
                            src={form.image_url}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Camera className="text-gray-400" size={24} />
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <Loader2 className="animate-spin text-gold-600" size={18} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-outline px-4 py-2 text-xs font-semibold rounded-lg"
                        >
                          Upload Image
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">Max size 3MB (JPG/PNG/WEBP)</p>
                      </div>
                    </div>
                  </div>

                  {/* Color Hex Picker */}
                  <div className="border-t border-gray-100 pt-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-flora-brown/70 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={hasColor}
                        onChange={(e) => {
                          setHasColor(e.target.checked);
                          if (e.target.checked && !form.color_hex) {
                            setForm(prev => ({ ...prev, color_hex: '#C9962A' }));
                          }
                        }}
                        className="rounded text-gold-600 focus:ring-gold-500"
                      />
                      Enable Color Preview
                    </label>
                    {hasColor && (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.color_hex || '#C9962A'}
                          onChange={(e) => setForm(prev => ({ ...prev, color_hex: e.target.value }))}
                          className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={form.color_hex || '#C9962A'}
                          onChange={(e) => setForm(prev => ({ ...prev, color_hex: e.target.value }))}
                          placeholder="#FFFFFF"
                          className="input font-mono flex-1 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Status toggles */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer p-2 bg-gray-50 rounded-xl hover:bg-gray-100/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-gold-600 focus:ring-gold-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-flora-brown">Active State</p>
                    <p className="text-[10px] text-gray-400">Show on storefront</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 bg-gray-50 rounded-xl hover:bg-gray-100/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_in_stock}
                    onChange={e => setForm(prev => ({ ...prev, is_in_stock: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-gold-600 focus:ring-gold-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-flora-brown">In Stock</p>
                    <p className="text-[10px] text-gray-400">Available to select</p>
                  </div>
                </label>
              </div>

              {/* Error warning */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
                  ⚠️ {error}
                </p>
              )}

              {/* Action Buttons */}
              <div className="border-t border-gray-100 pt-4 flex gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-outline flex-1 h-12 flex items-center justify-center font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="btn-gold flex-1 h-12 flex items-center justify-center font-medium rounded-xl disabled:opacity-50"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      Saving...
                    </div>
                  ) : (
                    'Save Add-on'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Addon Card Subcomponent
interface CardProps {
  addon: ProductAddon;
  onEdit: (addon: ProductAddon) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onToggleStock: (id: string, current: boolean) => void;
}

function AddonCard({ addon, onEdit, onDelete, onToggleActive, onToggleStock }: CardProps) {
  const typeBadge = ADDON_TYPES.find(t => t.value === addon.type)?.label || addon.type;
  
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
      {/* Top Details */}
      <div className="flex gap-4 items-start">
        {/* Preview Circle/Image */}
        <div
          className="w-18 h-18 rounded-xl relative overflow-hidden flex-shrink-0 border border-gray-100/50 flex items-center justify-center w-[72px] h-[72px]"
          style={{
            backgroundColor: addon.color_hex || undefined,
            background: !addon.color_hex && !addon.image_url ? 'linear-gradient(135deg, #C8CC7A 0%, #B2B56A 100%)' : undefined,
          }}
        >
          {addon.image_url ? (
            <Image
              src={addon.image_url}
              alt={addon.name}
              fill
              className="object-cover"
            />
          ) : (
            !addon.color_hex && <span className="text-xl">🌸</span>
          )}
        </div>
        
        {/* Name, Type, Price */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-flora-brown leading-snug truncate" title={addon.name}>
            {addon.name}
          </h3>
          <span className="inline-block text-[9px] uppercase font-sans font-bold tracking-wider text-flora-brown/40 border border-gray-200/50 px-2 py-0.5 rounded mt-1">
            {typeBadge}
          </span>
          <div className="flex items-baseline gap-0.5 mt-1.5">
            <span className="font-sans text-[10px] text-gold-600/70">LKR</span>
            <span className="price-small text-gold-600">
              {addon.price.toLocaleString('en-LK')}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {addon.description && (
        <p className="text-xs font-sans text-flora-brown/50 line-clamp-2 min-h-[32px]">
          {addon.description}
        </p>
      )}

      {/* Bottom Switch Toggles & Controls */}
      <div className="border-t border-gray-50 pt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* Active switch */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={addon.is_active}
              onChange={() => onToggleActive(addon.id, addon.is_active)}
              className="w-3.5 h-3.5 rounded text-gold-600 focus:ring-gold-500"
            />
            <span className="text-[10px] font-bold font-sans text-flora-brown/60 uppercase tracking-wider">Active</span>
          </label>

          {/* In stock switch */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={addon.is_in_stock}
              onChange={() => onToggleStock(addon.id, addon.is_in_stock)}
              className="w-3.5 h-3.5 rounded text-gold-600 focus:ring-gold-500"
            />
            <span className="text-[10px] font-bold font-sans text-flora-brown/60 uppercase tracking-wider">In Stock</span>
          </label>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(addon)}
            className="p-2 text-gray-400 hover:text-gold-600 hover:bg-gold-50/50 rounded-lg transition-colors"
            title="Edit addon"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(addon.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition-colors"
            title="Delete addon"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

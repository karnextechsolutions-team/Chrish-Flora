'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  Plus, Pencil, Trash2, X, UploadCloud, ChevronUp, ChevronDown, Check, AlertCircle, RefreshCw 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Banner } from '@/types';

interface Props {
  initialBanners: Banner[];
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  description: '',
  badge_text: '🌹 New Arrival',
  button_text: 'Shop Now',
  button_link: '/storefront/products',
  image_url: null as string | null,
  bg_color: '#C8CC7A',
  text_color: '#3D2E00',
  is_active: true,
  sort_order: 0,
};

const PRESET_BGS = [
  { name: 'Olive', value: '#C8CC7A' },
  { name: 'Dark Green', value: 'linear-gradient(135deg, #1C3829, #2D5A3D)' },
  { name: 'Gold', value: 'linear-gradient(135deg, #C9962A, #8B6914)' },
  { name: 'Dark Brown', value: '#3D2E00' },
  { name: 'Cream', value: '#FEFCF5' }
];

const PRESET_TEXTS = [
  { name: 'Dark', value: '#3D2E00' },
  { name: 'Light', value: '#FEFCF5' },
  { name: 'Gold', value: '#C9962A' }
];

export default function AdminBannersClient({ initialBanners }: Props) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Re-sort banners if the order changes
  useEffect(() => {
    setBanners([...initialBanners].sort((a, b) => a.sort_order - b.sort_order));
  }, [initialBanners]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      sort_order: banners.length > 0 ? Math.max(...banners.map(b => b.sort_order)) + 1 : 1
    });
    setShowModal(true);
    setError('');
    setUploadProgress(0);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle || '',
      description: b.description || '',
      badge_text: b.badge_text || '',
      button_text: b.button_text,
      button_link: b.button_link,
      image_url: b.image_url,
      bg_color: b.bg_color,
      text_color: b.text_color,
      is_active: b.is_active,
      sort_order: b.sort_order,
    });
    setShowModal(true);
    setError('');
    setUploadProgress(0);
  };

  const uploadBannerImage = async (file: File): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image must be under 5MB');
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Only JPG, PNG, and WEBP allowed');
    }

    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const filePath = `banners/${fileName}`;

    setUploadProgress(20);
    const { error: uploadError } = await supabase.storage
      .from('promotional-banners')
      .upload(filePath, file, { 
        cacheControl: '3600', 
        upsert: false 
      });

    if (uploadError) throw uploadError;

    setUploadProgress(70);
    const { data: { publicUrl } } = supabase.storage
      .from('promotional-banners')
      .getPublicUrl(filePath);
      
    setUploadProgress(100);
    return publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    setUploadProgress(5);

    try {
      const publicUrl = await uploadBannerImage(files[0]);
      setForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setForm(prev => ({ ...prev, image_url: null }));
    setUploadProgress(0);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!form.button_text.trim()) {
      setError('Button text is required');
      return;
    }
    if (!form.button_link.trim()) {
      setError('Button link is required');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      badge_text: form.badge_text.trim() || null,
      button_text: form.button_text.trim(),
      button_link: form.button_link.trim(),
      image_url: form.image_url,
      bg_color: form.bg_color,
      text_color: form.text_color,
      is_active: form.is_active,
      sort_order: form.sort_order,
      updated_at: new Date().toISOString()
    };

    try {
      if (editing) {
        const { data, error: err } = await supabase
          .from('promotional_banners')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();

        if (err) throw err;
        setBanners(prev => prev.map(b => b.id === editing.id ? data : b).sort((a, b) => a.sort_order - b.sort_order));
      } else {
        const { data, error: err } = await supabase
          .from('promotional_banners')
          .insert({
            ...payload,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (err) throw err;
        setBanners(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string | null) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return;

    try {
      // 1. Delete from database
      const { error: err } = await supabase
        .from('promotional_banners')
        .delete()
        .eq('id', id);

      if (err) throw err;

      // 2. Try deleting from storage if it exists in our bucket
      if (imageUrl && imageUrl.includes('/promotional-banners/')) {
        const urlParts = imageUrl.split('/promotional-banners/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('promotional-banners').remove([filePath]);
        }
      }

      setBanners(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete banner');
    }
  };

  const toggleActive = async (b: Banner) => {
    const nextState = !b.is_active;
    
    // Optimistic update
    setBanners(prev => prev.map(x => x.id === b.id ? { ...x, is_active: nextState } : x));

    try {
      const { error: err } = await supabase
        .from('promotional_banners')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', b.id);

      if (err) throw err;
    } catch (err: any) {
      // Revert state on failure
      setBanners(prev => prev.map(x => x.id === b.id ? { ...x, is_active: b.is_active } : x));
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const currentBanner = banners[index];
    const targetBanner = banners[targetIndex];

    const currentOrder = currentBanner.sort_order;
    const targetOrder = targetBanner.sort_order;

    // Optimistic Update
    const updatedBanners = [...banners];
    updatedBanners[index] = { ...currentBanner, sort_order: targetOrder };
    updatedBanners[targetIndex] = { ...targetBanner, sort_order: currentOrder };
    updatedBanners.sort((a, b) => a.sort_order - b.sort_order);
    setBanners(updatedBanners);

    try {
      const { error: err1 } = await supabase
        .from('promotional_banners')
        .update({ sort_order: targetOrder, updated_at: new Date().toISOString() })
        .eq('id', currentBanner.id);

      const { error: err2 } = await supabase
        .from('promotional_banners')
        .update({ sort_order: currentOrder, updated_at: new Date().toISOString() })
        .eq('id', targetBanner.id);

      if (err1 || err2) throw new Error('Database swap failed');
    } catch (err: any) {
      console.error(err);
      // Revert
      setBanners(banners);
      alert('Failed to update sort order in database. Reverting.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="font-serif text-3xl text-flora-brown">Promotional Banners</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Manage storefront hero slides, custom colors, backgrounds, and links.
          </p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus size={16} /> Add Banner
        </button>
      </div>

      {/* Banner List */}
      <div className="space-y-4">
        {banners.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8 shadow-sm flex flex-col items-center justify-center">
            <span className="text-4xl mb-3">🖼️</span>
            <p className="font-serif text-lg text-flora-brown font-medium">No banners yet.</p>
            <p className="text-xs text-gray-400 font-sans mt-1 mb-4">Add your first homepage promotional banner slider!</p>
            <button onClick={openCreate} className="btn-gold flex items-center gap-2">
              <Plus size={16} /> Add Banner
            </button>
          </div>
        ) : (
          banners.map((banner, index) => {
            const hasImage = !!banner.image_url;
            return (
              <div 
                key={banner.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Left: Mini Banner Preview */}
                <div 
                  className="w-40 h-20 rounded-xl overflow-hidden flex-shrink-0 relative flex items-center justify-center border border-gray-100 shadow-inner"
                  style={{
                    background: !hasImage ? banner.bg_color : undefined,
                  }}
                >
                  {hasImage && banner.image_url ? (
                    <Image 
                      src={banner.image_url} 
                      alt={banner.title} 
                      fill 
                      className="object-cover"
                      sizes="160px"
                    />
                  ) : (
                    <div 
                      className="px-2 text-center text-[10px] font-serif line-clamp-2 leading-tight"
                      style={{ color: banner.text_color }}
                    >
                      {banner.title}
                    </div>
                  )}
                  {hasImage && (
                    <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                      <span className="text-[10px] text-white font-sans bg-black/30 px-2 py-0.5 rounded backdrop-blur-[1px]">Image</span>
                    </div>
                  )}
                </div>

                {/* Middle: Details */}
                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-mono font-semibold text-gold-600 bg-gold-50 px-2 py-0.5 rounded border border-gold-100">
                      #{banner.sort_order}
                    </span>
                    <h3 className="font-serif text-lg text-flora-brown font-semibold truncate max-w-[200px]">
                      {banner.title}
                    </h3>
                    {banner.badge_text && (
                      <span className="text-[9px] font-sans font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {banner.badge_text}
                      </span>
                    )}
                  </div>
                  {banner.subtitle && (
                    <p className="text-xs text-gray-500 font-sans line-clamp-1">{banner.subtitle}</p>
                  )}
                  <p className="text-[10px] text-gray-400 font-sans">
                    Action: <span className="font-medium text-gray-600">{banner.button_text}</span> &rarr; <span className="italic">{banner.button_link}</span>
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {/* Status Toggle */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold font-sans uppercase ${banner.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleActive(banner)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${banner.is_active ? 'bg-gold' : 'bg-gray-300'}`}
                      aria-label="Toggle active status"
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${banner.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Ordering arrows */}
                  <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                    <button
                      disabled={index === 0}
                      onClick={() => handleReorder(index, 'up')}
                      className="p-1 text-gray-400 hover:text-gold disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <div className="w-[1px] h-4 bg-gray-200" />
                    <button
                      disabled={index === banners.length - 1}
                      onClick={() => handleReorder(index, 'down')}
                      className="p-1 text-gray-400 hover:text-gold disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Edit/Delete */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEdit(banner)}
                      className="p-2 text-gray-400 hover:text-gold hover:bg-gray-50 rounded-lg transition-colors"
                      title="Edit Banner"
                    >
                      <Pencil size={15} />
                    </button>
                    <button 
                      onClick={() => handleDelete(banner.id, banner.image_url)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Banner"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setShowModal(false)} />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[92vh] sm:rounded-2xl shadow-2xl p-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 shrink-0">
              <h2 className="font-serif text-2xl text-flora-brown">
                {editing ? 'Edit Promotional Banner' : 'New Promotional Banner'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 scroll-touch">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-red-700 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Content Fields */}
              <div className="space-y-4">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gold-700">1. Banner Content</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Banner Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Fresh Roses Daily" 
                      className="input" 
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Subtitle</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Up to 20% OFF on all bouquets" 
                      className="input" 
                      value={form.subtitle}
                      onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Badge Pill Text (optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 🌹 New Arrival" 
                      className="input" 
                      value={form.badge_text}
                      onChange={e => setForm(p => ({ ...p, badge_text: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Button Link *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. /storefront/products" 
                      className="input" 
                      value={form.button_link}
                      onChange={e => setForm(p => ({ ...p, button_link: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Button Text *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Shop Now" 
                      className="input" 
                      value={form.button_text}
                      onChange={e => setForm(p => ({ ...p, button_text: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Sort Order</label>
                    <input 
                      type="number" 
                      className="input" 
                      value={form.sort_order}
                      onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Description (Shown on Desktop)</label>
                  <textarea 
                    rows={3} 
                    placeholder="Handpicked fresh premium arrangements delivered daily." 
                    className="input resize-none h-auto"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* 2. Image Selection & Upload */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gold-700">2. Promotional Image</h3>
                
                {form.image_url ? (
                  <div className="relative aspect-[2.5/1] w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group">
                    <Image src={form.image_url} alt="Uploaded Banner" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow transition-colors flex items-center justify-center"
                      title="Remove Image"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">
                      Image Mode Enabled
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 hover:bg-gray-100 hover:border-gold cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px]"
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center space-y-2">
                          <RefreshCw className="animate-spin text-gold" size={28} />
                          <span className="text-xs font-medium text-gray-500">Uploading image ({uploadProgress}%)</span>
                          <div className="w-40 bg-gray-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-gold h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={32} className="text-gray-400 mb-2" />
                          <span className="text-xs font-semibold text-gray-600">Drag & drop or click to upload banner image</span>
                          <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">JPG, PNG, WEBP allowed (Max 5MB)</span>
                        </>
                      )}
                    </div>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg, image/jpg, image/png, image/webp"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <p className="text-[11px] text-gray-400 leading-normal font-sans">
                      Recommended image size: 1400 &times; 560px (desktop) or 800 &times; 400px minimum. Landscape orientation works best. PNG or JPG, max 5MB.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Appearance Setup (Presets & custom) */}
              {!form.image_url && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gold-700">3. Background & Styling</h3>
                  
                  {/* Preset Colors */}
                  <div className="space-y-2">
                    <label className="label">Background Color / Gradient Preset</label>
                    <div className="flex flex-wrap gap-2.5">
                      {PRESET_BGS.map(preset => {
                        const isSelected = form.bg_color === preset.value;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, bg_color: preset.value }))}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-medium transition-all ${
                              isSelected 
                                ? 'border-gold-600 bg-gold-50 text-gold-800 ring-2 ring-gold-200' 
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <span 
                              className="inline-block w-3.5 h-3.5 rounded-full mr-1.5 border border-black/10 align-middle -mt-0.5"
                              style={{ background: preset.value }}
                            />
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Custom Bg Color Picker */}
                    <div>
                      <label className="label">Custom BG Code (Hex or CSS gradient)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="input font-mono text-xs" 
                          placeholder="e.g. #C8CC7A or linear-gradient(...)"
                          value={form.bg_color}
                          onChange={e => setForm(p => ({ ...p, bg_color: e.target.value }))}
                        />
                        <input 
                          type="color" 
                          className="w-11 h-11 shrink-0 p-0 border border-gray-200 rounded-xl cursor-pointer"
                          value={form.bg_color.startsWith('#') && form.bg_color.length === 7 ? form.bg_color : '#C8CC7A'}
                          onChange={e => setForm(p => ({ ...p, bg_color: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Text Color Selection */}
                    <div>
                      <label className="label">Text Color</label>
                      <div className="flex gap-2">
                        {PRESET_TEXTS.map(preset => {
                          const isSelected = form.text_color === preset.value;
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setForm(p => ({ ...p, text_color: preset.value }))}
                              className={`flex-1 py-2 rounded-xl border text-xs font-sans font-semibold transition-all ${
                                isSelected 
                                  ? 'border-gold-600 bg-gold-50 text-gold-800' 
                                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <span 
                                className="inline-block w-3 h-3 rounded-full mr-1.5 border border-black/10 align-middle"
                                style={{ backgroundColor: preset.value }}
                              />
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Active Toggle Status */}
              <div className="pt-2 border-t border-gray-100 flex items-center gap-3 py-1">
                <input 
                  type="checkbox" 
                  id="active_status"
                  className="rounded text-gold focus:ring-gold border-gray-300 w-4 h-4"
                  checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                />
                <label htmlFor="active_status" className="text-sm font-sans font-medium text-flora-brown select-none cursor-pointer">
                  Active (Display this banner in storefront hero slider)
                </label>
              </div>

              {/* 5. Live Visual Preview */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gold-700">Live Visual Preview</h3>
                <div 
                  className="relative w-full h-[180px] rounded-2xl overflow-hidden border border-gray-200 select-none shadow-sm"
                  style={{
                    background: !form.image_url ? form.bg_color : undefined,
                  }}
                >
                  {form.image_url && (
                    <>
                      <img 
                        src={form.image_url} 
                        alt="Preview" 
                        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                      />
                      <div 
                        className="absolute inset-0 z-10"
                        style={{
                          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.45) 50%, rgba(0, 0, 0, 0.15) 100%)',
                        }}
                      />
                    </>
                  )}

                  {!form.image_url && (
                    <div 
                      className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border pointer-events-none opacity-20"
                      style={{ borderColor: form.text_color ? `${form.text_color}30` : 'rgba(255,255,255,0.1)' }}
                    />
                  )}

                  {/* Content Overlay */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 max-w-[70%] z-20 pointer-events-none text-left">
                    {form.badge_text && (
                      <div 
                        className="inline-flex px-2 py-0.5 rounded-full border border-white/20 mb-1.5"
                        style={{
                          backgroundColor: form.image_url ? 'rgba(255, 255, 255, 0.15)' : `${form.text_color}15`,
                          borderColor: form.image_url ? 'rgba(255, 255, 255, 0.25)' : `${form.text_color}25`,
                        }}
                      >
                        <span 
                          className="font-sans text-[7px] tracking-wider uppercase font-bold"
                          style={{ color: form.image_url ? '#FFFFFF' : form.text_color || '#3D2E00' }}
                        >
                          {form.badge_text}
                        </span>
                      </div>
                    )}
                    <h4 
                      className="font-serif text-lg font-bold leading-tight line-clamp-2 mb-1"
                      style={{ color: form.image_url ? '#FFFFFF' : form.text_color }}
                    >
                      {form.title || 'Untitled Banner'}
                    </h4>
                    {form.subtitle && (
                      <p 
                        className="font-sans text-[10px] leading-normal line-clamp-1 mb-2"
                        style={{ color: form.image_url ? 'rgba(255, 255, 255, 0.8)' : `${form.text_color}bb` }}
                      >
                        {form.subtitle}
                      </p>
                    )}
                    <div className="bg-white text-[#3D2E00] px-3.5 py-1.5 rounded-lg font-sans text-[9px] font-bold shadow-sm inline-block uppercase tracking-wider">
                      {form.button_text || 'Shop Now'} &rarr;
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="pt-4 border-t border-gray-100 flex gap-3 shrink-0 pb-safe">
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="btn-outline flex-1 h-12 flex items-center justify-center font-sans"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={saving || uploading}
                onClick={handleSave} 
                className="btn-gold flex-1 h-12 flex items-center justify-center font-sans font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Update Banner' : 'Save Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

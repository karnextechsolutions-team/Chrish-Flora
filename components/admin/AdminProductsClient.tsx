'use client';
// components/admin/AdminProductsClient.tsx
import { useState, useRef } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, X, UploadCloud, Check, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Product, ProductReview } from '@/types';

interface Props { 
  initialProducts: Product[];
  initialReviews: any[];
}

const EMPTY_FORM = {
  name: '', slug: '', description: '', price: '', quantity: '', sku: '', category: '', is_active: true, images: [] as string[]
};

export default function AdminProductsClient({ initialProducts, initialReviews }: Props) {
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  
  // Product Form State
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); setError(''); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, slug: p.slug, description: p.description || '',
      price: p.price.toString(), quantity: p.quantity.toString(),
      sku: p.sku, category: p.category || '',
      is_active: p.is_active as any,
      images: [p.image_url, ...(p.images || [])].filter(Boolean) as string[], // Gather all images, avoid dupes
    });
    // Remove duplicates if image_url is also in images array
    setForm(prev => ({ ...prev, images: Array.from(new Set(prev.images)) }));
    setShowForm(true);
    setError('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (form.images.length + files.length > 3) {
      setError('Maximum 3 images allowed per product.');
      return;
    }

    setUploading(true);
    setError('');

    const newImageUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Max 5MB.`);
        continue;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`; // Changed to products folder without id since id may not exist yet

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        setError(`Error uploading ${file.name}: ${uploadError.message}`);
      } else if (data) {
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);
        
        if (publicUrlData) {
          newImageUrls.push(publicUrlData.publicUrl);
        }
      }
    }

    if (newImageUrls.length > 0) {
      setForm(prev => ({ ...prev, images: [...prev.images, ...newImageUrls] }));
    }
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    const imageUrl = form.images.length > 0 ? form.images[0] : null;
    const additionalImages = form.images.length > 1 ? form.images.slice(1) : []; // store rest in images array, or store all in images array. requirement: "Store all image URLs as JSONB array... First image = primary display image (products.image_url)". So store all in images.

    const payload = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      description: form.description || null,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity),
      sku: form.sku,
      image_url: imageUrl,
      images: form.images, // all images
      category: form.category || null,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const { data, error: err } = await supabase.from('products').update(payload).eq('id', editing.id).select().single();
        if (err) throw err;
        setProducts(prev => prev.map(p => p.id === editing.id ? data : p));
      } else {
        const { data, error: err } = await supabase.from('products').insert(payload).select().single();
        if (err) throw err;
        setProducts(prev => [data, ...prev]);
      }
      setShowForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  // Review Handlers
  const handleApproveReview = async (id: string) => {
    const { error } = await supabase.from('product_reviews').update({ is_approved: true }).eq('id', id);
    if (!error) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    const { error } = await supabase.from('product_reviews').delete().eq('id', id);
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-flora-brown">Management</h1>
        {activeTab === 'products' && (
          <button onClick={openCreate} className="btn-gold flex items-center gap-2">
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`font-sans font-medium px-4 py-2 ${activeTab === 'products' ? 'text-gold-600 border-b-2 border-gold-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`font-sans font-medium px-4 py-2 flex items-center gap-2 ${activeTab === 'reviews' ? 'text-gold-600 border-b-2 border-gold-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Reviews
          {reviews.filter(r => !r.is_approved).length > 0 && (
            <span className="bg-gold-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
              {reviews.filter(r => !r.is_approved).length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'products' && (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs tracking-widest uppercase text-gray-400">Product</th>
                  <th className="text-left px-6 py-3 text-xs tracking-widest uppercase text-gray-400">SKU</th>
                  <th className="text-right px-6 py-3 text-xs tracking-widest uppercase text-gray-400">Price</th>
                  <th className="text-center px-6 py-3 text-xs tracking-widest uppercase text-gray-400">Stock</th>
                  <th className="text-center px-6 py-3 text-xs tracking-widest uppercase text-gray-400">Active</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-olive-100 flex-shrink-0 overflow-hidden relative">
                          {p.image_url ? (
                            <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">🌸</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-flora-brown">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gold-600">{p.sku}</td>
                    <td className="px-6 py-4 text-right tabular">LKR {p.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`badge-status border ${p.quantity === 0 ? 'bg-red-100 text-red-700 border-red-200' : p.quantity < 5 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${p.is_active ? 'bg-gold-600' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-gold-600 transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid (2 Columns) */}
          <div className="lg:hidden grid grid-cols-2 gap-3">
            {products.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
                {/* Image top */}
                <div className="relative aspect-square w-full bg-olive-100 shrink-0">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🌸</div>
                  )}
                  {/* Stock badge overlay */}
                  <span className={`absolute top-2 left-2 badge-status border text-[9px] ${p.quantity === 0 ? 'bg-red-100 text-red-700 border-red-200' : p.quantity < 5 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                    {p.quantity} Units
                  </span>
                </div>

                {/* Details */}
                <div className="p-3 flex flex-col flex-1 justify-between gap-1 bg-white">
                  <div>
                    <h3 className="font-serif font-semibold text-xs text-flora-brown line-clamp-1">{p.name}</h3>
                    <p className="text-[9px] text-gray-400 font-mono">{p.sku}</p>
                    <p className="text-[9px] text-gold-600 font-sans">{p.category}</p>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-gray-50 flex-wrap gap-1">
                    <p className="font-serif text-[11px] font-bold text-gold-700">LKR {p.price.toLocaleString()}</p>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openEdit(p)} className="p-1 text-gray-400 hover:text-gold-600 transition-colors" aria-label="Edit product">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" aria-label="Delete product">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="col-span-2 text-center py-10 text-gray-400 font-sans text-xs">No products found.</p>
            )}
          </div>
        </>
      )}

      {activeTab === 'reviews' && (
        <div className="bg-white border border-gray-100 shadow-sm overflow-hidden p-6 space-y-6">
          {reviews.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No reviews found.</p>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="border border-gray-100 p-4 rounded flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-serif font-medium">{review.reviewer_name}</span>
                    <span className="text-xs text-gray-400">on {review.product?.name || 'Unknown Product'}</span>
                    {!review.is_approved && (
                      <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pending</span>
                    )}
                  </div>
                  <div className="flex text-gold-500 text-sm mb-2">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!review.is_approved && (
                    <button onClick={() => handleApproveReview(review.id)} className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1">
                      <Check size={14} /> Approve
                    </button>
                  )}
                  <button onClick={() => handleDeleteReview(review.id)} className="btn-outline border-red-200 text-red-600 hover:bg-red-50 py-1.5 px-3 text-xs flex items-center gap-1">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full h-full lg:h-auto lg:max-w-2xl lg:max-h-[90vh] shadow-2xl p-6 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="font-serif text-2xl text-flora-brown">
                {editing ? 'Edit Product' : 'New Product'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-2" aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-6 scroll-touch">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                <div className="space-y-4">
                  {[
                    { key: 'name', label: 'Product Name *', type: 'text' },
                    { key: 'sku', label: 'SKU Code *', type: 'text' },
                    { key: 'price', label: 'Price (LKR) *', type: 'number' },
                    { key: 'quantity', label: 'Stock Quantity *', type: 'number' },
                    { key: 'category', label: 'Category', type: 'text' },
                    { key: 'slug', label: 'Slug (auto-generated if empty)', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="label">{f.label}</label>
                      <input
                        type={f.type}
                        className="input"
                        value={(form as any)[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="label">Description</label>
                    <textarea rows={3} className="input resize-none h-auto min-h-[80px]"
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <input type="checkbox" id="is_active" checked={form.is_active as any}
                      onChange={e => setForm(p => ({ ...p, is_active: e.target.checked as any }))} />
                    <label htmlFor="is_active" className="text-sm font-sans text-flora-brown">
                      Active (visible on storefront)
                    </label>
                  </div>
                </div>

                {/* Images Upload */}
                <div className="space-y-4">
                  <label className="label">Product Images (Max 3)</label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {form.images.map((img, i) => {
                      const isPrimary = i === 0;
                      const colSpanClass = isPrimary ? 'col-span-2 sm:col-span-1' : 'col-span-1';
                      const aspectClass = isPrimary ? 'aspect-[2/1] sm:aspect-square' : 'aspect-square';
                      
                      return (
                        <div key={i} className={`${colSpanClass} ${aspectClass} relative bg-gray-100 border border-gray-200 group overflow-hidden`}>
                          <Image src={img} alt={`Preview ${i}`} fill className="object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow min-h-[32px] min-w-[32px] flex items-center justify-center z-10"
                          >
                            <X size={14} />
                          </button>
                          {isPrimary && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-1 font-bold z-10">Primary</span>}
                        </div>
                      );
                    })}
                    
                    {form.images.length < 3 && (
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`${form.images.length === 0 ? 'col-span-2 sm:col-span-1 aspect-[2/1] sm:aspect-square' : 'col-span-1 aspect-square'} border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gold-500 hover:text-gold-600 transition-colors bg-gray-50 disabled:opacity-50 min-h-[44px]`}
                      >
                        {uploading ? <span className="text-xs">Uploading...</span> : (
                          <>
                            <UploadCloud size={24} className="mb-1" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                              Upload {form.images.length === 0 ? 'Primary' : ''}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/jpeg, image/png, image/webp" 
                    multiple 
                    onChange={handleFileUpload}
                  />
                  
                  <p className="text-xs text-gray-500 leading-relaxed">
                    First image is the primary thumbnail. Formats: JPG, PNG, WEBP. Max size: 5MB.
                  </p>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions (Sticky) */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3 shrink-0 pb-safe">
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1 h-12 flex items-center justify-center">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading} className="btn-gold flex-1 h-12 flex items-center justify-center font-medium">
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

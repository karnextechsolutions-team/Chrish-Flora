'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { createClient } from '@/lib/supabase/client';
import StarRating from '@/components/ui/StarRating';
import type { Product, ProductReview, ProductAddon } from '@/types';
import Link from 'next/link';
import ProductCustomizer from './ProductCustomizer';

interface Props {
  product: Product;
  initialReviews: ProductReview[];
  relatedProducts: Product[];
  userId?: string;
  addons: ProductAddon[];
}

export default function ProductDetailClient({ product, initialReviews, relatedProducts, userId, addons }: Props) {
  const { dispatch, state } = useCart();
  const inCart = state.items.find((i) => i.product.id === product.id);
  const isOutOfStock = product.quantity <= 0;
  
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews);
  const [mainImage, setMainImage] = useState<string>(product.image_url || '');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const images = [product.image_url, ...(product.images || [])].filter(Boolean) as string[];
  // Limit to 3 images as per requirement
  const displayImages = images.slice(0, 3);

  useEffect(() => {
    // Set up real-time subscription for reviews
    const supabase = createClient();
    const channel = supabase
      .channel('public:product_reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_reviews', filter: `product_id=eq.${product.id}` },
        (payload) => {
          // In a real app, you might want to fetch the updated list or carefully append
          // Here we refetch to ensure we only show approved ones, or we can just append if it's approved.
          const fetchReviews = async () => {
            const { data } = await supabase
              .from('product_reviews')
              .select('*')
              .eq('product_id', product.id)
              .eq('is_approved', true)
              .order('created_at', { ascending: false });
            if (data) setReviews(data);
          };
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id]);

  const avgRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess(false);
    try {
      const supabase = createClient();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      
      const { error } = await supabase.from('product_reviews').insert({
        product_id: product.id,
        user_id: userId,
        reviewer_name: profile?.full_name || 'Customer',
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        is_approved: false // requires admin approval
      });

      if (error) throw error;
      setReviewSuccess(true);
      setReviewForm({ rating: 5, comment: '' });
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm font-sans text-flora-brown/60 mb-8">
        <Link href="/storefront" className="hover:text-gold-600">Home</Link>
        <span className="mx-2">{'>'}</span>
        <Link href="/storefront/products" className="hover:text-gold-600">Collections</Link>
        <span className="mx-2">{'>'}</span>
        <span className="text-flora-brown">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] bg-olive-100 overflow-hidden shadow-md">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-olive-300">🌸</div>
            )}
          </div>
          {displayImages.length > 1 && (
            <div className="flex gap-4">
              {displayImages.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setMainImage(img)}
                  className={`relative w-24 h-24 bg-olive-100 border-2 transition-colors ${mainImage === img ? 'border-gold-500' : 'border-transparent hover:border-gold-300'}`}
                >
                  <Image src={img} alt={`${product.name} thumbnail ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="text-sm font-sans text-gold-600 tracking-widest uppercase mb-2">{product.sku}</p>
          <h1 className="font-serif text-4xl text-flora-brown mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="font-serif text-3xl text-gold-700 tabular">
              LKR {product.price.toLocaleString('en-LK')}
            </span>
            <div className="flex items-center gap-2 text-sm font-sans text-flora-brown/70 bg-flora-cream-dark/30 px-3 py-1 rounded-full">
              <StarRating rating={Math.round(avgRating)} readOnly />
              <span>({reviews.length})</span>
            </div>
          </div>

          <div className="mb-6">
            {isOutOfStock ? (
              <span className="badge-status bg-red-100 text-red-700 border border-red-200">OUT OF STOCK</span>
            ) : (
              <span className="badge-status bg-green-100 text-green-700 border border-green-200">IN STOCK ({product.quantity} UNITS)</span>
            )}
          </div>

          <p className="text-base font-sans text-flora-brown/80 leading-relaxed mb-8 whitespace-pre-line">
            {product.description}
          </p>

          <ProductCustomizer product={product} addons={addons} />
        </div>
      </div>

      <hr className="border-flora-cream-dark mb-16" />

      {/* Reviews Section */}
      <div className="mb-20">
        <h2 className="font-serif text-3xl text-flora-brown mb-8">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-8">
            {reviews.length === 0 ? (
              <p className="text-flora-brown/60 font-sans italic">No reviews yet. Be the first to review this product!</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-flora-cream-dark pb-6 last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <StarRating rating={review.rating} readOnly />
                    <span className="font-serif text-lg text-flora-brown">{review.reviewer_name}</span>
                    <span className="text-xs font-sans text-flora-brown/40 ml-auto">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-sans text-flora-brown/80">{review.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Review Form */}
          <div className="bg-flora-cream-dark/10 p-6 rounded-sm border border-flora-cream-dark h-fit">
            <h3 className="font-serif text-xl text-flora-brown mb-6">Write a Review</h3>
            {userId ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="label block mb-2">Rating</label>
                  <StarRating 
                    rating={reviewForm.rating} 
                    readOnly={false} 
                    onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} 
                    size={24}
                  />
                </div>
                <div>
                  <label className="label block mb-2">Comment</label>
                  <textarea
                    required
                    rows={4}
                    className="input resize-none"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share your thoughts about this arrangement..."
                  />
                </div>
                {reviewError && <p className="text-sm text-red-600 bg-red-50 p-2">{reviewError}</p>}
                {reviewSuccess && <p className="text-sm text-green-700 bg-green-50 p-2 border border-green-200">Thank you! Your review has been submitted and is pending approval.</p>}
                <button type="submit" disabled={submittingReview} className="btn-gold w-full py-3">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm font-sans text-flora-brown/70 mb-4">Please sign in to leave a review.</p>
                <Link href={`/auth/login?returnTo=/storefront/products/${product.slug}`} className="btn-outline px-6 py-2 inline-block">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="font-serif text-3xl text-flora-brown mb-8 text-center">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {relatedProducts.map(p => (
              <Link key={p.id} href={`/storefront/products/${p.slug}`} className="group block">
                <div className="relative aspect-[4/3] bg-olive-100 overflow-hidden mb-4">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-olive-300">🌸</div>
                  )}
                </div>
                <h3 className="font-serif text-lg text-flora-brown group-hover:text-gold-600 transition-colors text-center">{p.name}</h3>
                <p className="font-serif text-gold-700 text-center mt-1">LKR {p.price.toLocaleString('en-LK')}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

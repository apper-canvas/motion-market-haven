import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "@/store/cartSlice";
import { toast } from "react-toastify";
import { productService } from "@/services/api/productService";
import { reviewService } from "@/services/api/reviewService";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import Select from "@/components/atoms/Select";
import StarRating from "@/components/molecules/StarRating";
import WishlistButton from "@/components/molecules/WishlistButton";
import ProductGrid from "@/components/organisms/ProductGrid";
import Loading from "@/components/ui/Loading";
import Error from "@/components/ui/Error";
import ApperIcon from "@/components/ApperIcon";
import { formatPrice } from "@/utils/formatCurrency";
import { format } from "date-fns";

const ProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProductData();
  }, [id]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productData, reviewsData, recommendedData] = await Promise.all([
        productService.getById(id),
        reviewService.getByProductId(id),
        productService.getRecommended(id)
      ]);
      
      setProduct(productData);
      setReviews(reviewsData);
      setRecommendations(recommendedData);
      
      // Set default selections
      if (productData.sizes && productData.sizes.length > 0) {
        setSelectedSize(productData.sizes[0]);
      }
      if (productData.colors && productData.colors.length > 0) {
        setSelectedColor(productData.colors[0]);
      }
      
    } catch (err) {
      setError("Failed to load product details. Please try again.");
      console.error("Error loading product:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product.stock === 0) {
      toast.error("Product is out of stock");
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    if (product.colors && product.colors.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }

    dispatch(addToCart({ 
      product,
      quantity,
      selectedSize: selectedSize || null,
      selectedColor: selectedColor || null,
    }));
    
    toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart!`);
  };

  const handleVoteHelpful = async (reviewId) => {
    try {
      await reviewService.voteHelpful(reviewId);
      // Reload reviews to show updated vote count
      const updatedReviews = await reviewService.getByProductId(id);
      setReviews(updatedReviews);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      toast.error("Failed to record your vote");
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !product) {
    return <Error message={error} onRetry={loadProductData} />;
  }

  const priceInfo = formatPrice(product.price, product.compareAtPrice);

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 space-x-2">
        <Link to="/" className="hover:text-primary">Home</Link>
        <ApperIcon name="ChevronRight" size={16} />
        <Link to={`/category/${product.category.toLowerCase()}`} className="hover:text-primary">
          {product.category}
        </Link>
        <ApperIcon name="ChevronRight" size={16} />
        <span className="text-gray-900">{product.name}</span>
      </nav>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors duration-200 ${
                    selectedImage === index ? "border-primary" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{product.brand}</Badge>
              <WishlistButton productId={product.Id} />
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900">
              {product.name}
            </h1>
            <StarRating 
              rating={product.rating} 
              showCount 
              reviewCount={product.reviewCount}
              size={18}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {priceInfo.price}
              </span>
              {priceInfo.compareAt && (
                <span className="text-xl text-gray-500 line-through">
                  {priceInfo.compareAt}
                </span>
              )}
              {priceInfo.savingsPercent && (
                <Badge variant="error" className="bg-primary text-white">
                  -{priceInfo.savingsPercent}% OFF
                </Badge>
              )}
            </div>
            {priceInfo.savings && (
              <p className="text-success font-medium">
                You save {priceInfo.savings}
              </p>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {product.stock > 10 ? (
              <Badge variant="success" className="bg-success/10 text-success">
                <ApperIcon name="Check" size={14} className="mr-1" />
                In Stock
              </Badge>
            ) : product.stock > 0 ? (
              <Badge variant="warning" className="bg-warning/10 text-warning">
                <ApperIcon name="AlertTriangle" size={14} className="mr-1" />
                Only {product.stock} left
              </Badge>
            ) : (
              <Badge variant="error" className="bg-error/10 text-error">
                <ApperIcon name="X" size={14} className="mr-1" />
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                        selectedSize === size
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 hover:border-primary"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.colors && product.colors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                        selectedColor === color
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 hover:border-primary"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                >
                  <ApperIcon name="Minus" size={16} />
                </button>
                <span className="w-16 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                  disabled={quantity >= product.stock}
                >
                  <ApperIcon name="Plus" size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="space-y-4">
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full py-3"
              size="lg"
              icon="ShoppingCart"
            >
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
            
            <Button
              variant="secondary"
              className="w-full py-3"
              size="lg"
              icon="Heart"
            >
              Add to Wishlist
            </Button>
          </div>

          {/* Description */}
          <div className="border-t pt-6">
            <h3 className="font-display font-semibold text-lg mb-3">Description</h3>
            <p className="text-gray-700 leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Specifications */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <div className="bg-surface rounded-xl border border-gray-100 p-6">
          <h3 className="font-display font-semibold text-xl mb-4">Specifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span className="font-medium text-gray-700">{key}</span>
                <span className="text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-6">
        <h3 className="font-display font-semibold text-2xl">Customer Reviews</h3>
        
        {reviews.length === 0 ? (
          <div className="bg-surface rounded-xl border border-gray-100 p-8 text-center">
            <ApperIcon name="MessageCircle" size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.Id} className="bg-surface rounded-xl border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={review.rating} size={16} />
                      {review.verified && (
                        <Badge variant="success" size="xs">Verified Purchase</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900">{review.title}</h4>
                    <p className="text-sm text-gray-600">
                      By {review.reviewerName} • {format(new Date(review.date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{review.comment}</p>
                
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVoteHelpful(review.Id)}
                    icon="ThumbsUp"
                    className="text-gray-600 hover:text-primary"
                  >
                    Helpful ({review.helpfulVotes})
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Products */}
      {recommendations.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-display font-semibold text-2xl">You Might Also Like</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((product) => (
              <div key={product.Id} className="bg-surface rounded-xl border border-gray-100 overflow-hidden hover:shadow-card-hover transition-shadow duration-200">
                <Link to={`/product/${product.Id}`}>
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-1">{product.brand}</p>
                    <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={product.rating} size={14} />
                      <span className="text-sm text-gray-600">({product.reviewCount})</span>
                    </div>
                    <p className="font-bold text-gray-900">{formatPrice(product.price).price}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
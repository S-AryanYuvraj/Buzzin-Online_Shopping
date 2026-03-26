import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Search, ShoppingBag, Plus, Trash2, LogIn, UserPlus,
  ChevronLeft, ChevronRight, ArrowUpDown, Package, Tag, LogOut
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop"
];

const AUTH_IMAGES = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=1887&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
];
const AUTH_TEXTS = [
  { title: "Unlock the Marketplace.", subtitle: "Connect with top sellers and find exactly what you need." },
  { title: "Trending Discoveries.", subtitle: "Stay ahead of the curve with our curated daily drops." },
  { title: "Join the Buzzin Hive.", subtitle: "Experience shopping redefined. Smooth, secure, and fast." }
];

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("shopuser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "", role: "BUYER" });
  const [authError, setAuthError] = useState("");

  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(8);
  const [sortBy, setSortBy] = useState("id");
  const [direction, setDirection] = useState("ASC");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [authSlide, setAuthSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_IMAGES.length);
      setAuthSlide(prev => (prev + 1) % AUTH_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const [addOpen, setAddOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "" });
  const [productImage, setProductImage] = useState(null);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [cart, setCart] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  const loadCart = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/cart`, {
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (res.ok) {
        setCart(await res.json());
      }
    } catch { }
  }, [user]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function addToCart(productId) {
    if (!user) return;
    try {
      const res = await fetch(`${API}/cart/add?productId=${productId}&quantity=1`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (res.ok) setCart(await res.json());
    } catch { }
  }

  async function updateCartItemQuantity(productId, quantityChange) {
    if (!user) return;
    try {
      const res = await fetch(`${API}/cart/add?productId=${productId}&quantity=${quantityChange}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (res.ok) setCart(await res.json());
    } catch { }
  }

  async function clearCart() {
    if (!user) return;
    try {
      const res = await fetch(`${API}/cart/clear`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (res.ok) setCart(await res.json());
    } catch { }
  }

  async function handleCheckout() {
    if (!user || !cart || !cart.items.length) return;
    try {
      const res = await fetch(`${API}/api/payment/createOrder`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error("Failed to create order");
      const order = await res.json();
      
      const options = {
        key: order.keyId,
        amount: order.amount * 100, // paise
        currency: order.currency,
        name: "Buzzin",
        description: "Test Transaction",
        order_id: order.orderId,
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API}/api/payment/verify`, {
              method: 'POST',
              headers: { 
                "Authorization": `Bearer ${user.token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            if (verifyRes.ok) {
              alert("Payment successful!");
              loadCart();
              setCartOpen(false);
            } else {
              alert("Payment verification failed");
            }
          } catch(err) {
            alert("Error verifying payment");
          }
        },
        theme: { color: "#3399cc" }
      };
      
      const rzp1 = new window.Razorpay(options);
      rzp1.open();
      
    } catch(err) {
      alert(err.message);
    }
  }

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({
      page: currentPage,
      size: pageSize,
      sortBy,
      direction,
      search: search || "",
    });
    try {
      const res = await fetch(`${API}/productlist?${params}`);
      const data = await res.json();
      setProducts(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch {
      setProducts([]);
    }
  }, [currentPage, pageSize, sortBy, direction, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setCurrentPage(0);
  }, [search, sortBy, direction]);

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === "login") {
        const params = new URLSearchParams({
          username: authForm.username,
          password: authForm.password,
        });
        const res = await fetch(`${API}/login`, {
          method: "POST",
          body: params,
        });
        if (!res.ok) throw new Error("Invalid username or password");
        const data = await res.json();
        const loggedInUser = { username: data.username, token: data.token, role: data.role };
        setUser(loggedInUser);
        localStorage.setItem("shopuser", JSON.stringify(loggedInUser));
      } else {
        const res = await fetch(`${API}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: authForm.username,
            email: authForm.email,
            password: authForm.password,
            role: authForm.role,
          }),
        });
        if (!res.ok) throw new Error("Registration failed");
        setAuthMode("login");
        setAuthError("Registered! Please log in.");
      }
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      const formData = new FormData();
      formData.append("name", productForm.name);
      formData.append("description", productForm.description);
      formData.append("price", productForm.price);
      if (productImage) formData.append("image", productImage);

      const res = await fetch(`${API}/addproduct`, { 
        method: "POST", 
        body: formData,
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error("Failed to add product");
      setProductForm({ name: "", description: "", price: "" });
      setProductImage(null);
      setAddOpen(false);
      loadProducts();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    try {
      const headers = { "Authorization": `Bearer ${user.token}` };
      await fetch(`${API}/deleteproduct/${id}`, { method: "DELETE", headers });
      loadProducts();
    } catch { }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex bg-background">
        {/* Left Side: Auth Carousel */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden bg-muted">
          {AUTH_IMAGES.map((img, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === authSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
               <img src={img} className="w-full h-full object-cover" alt="Auth background" />
               <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
               <div className={`absolute bottom-20 left-12 right-12 transition-all duration-700 delay-300 ${i === authSlide ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
                  <h2 className="text-5xl font-black text-white mb-3 tracking-tight">{AUTH_TEXTS[i].title}</h2>
                  <p className="text-xl text-gray-300 font-medium max-w-lg">{AUTH_TEXTS[i].subtitle}</p>
               </div>
            </div>
          ))}
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-[500px] flex items-center justify-center p-8 bg-background relative border-l border-border/40 shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <Card className="w-full max-w-sm relative border-none bg-transparent shadow-none">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-5">
              <div className="p-4 rounded-3xl bg-primary/10 shadow-[0_0_30px_rgba(233,30,99,0.15)] ring-1 ring-primary/20">
                <ShoppingBag className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Buzzin</CardTitle>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              {authMode === "login" ? "Welcome back. Access your account." : "Start your ecommerce journey today."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Username</label>
                <Input
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  placeholder="Enter username"
                  required
                />
              </div>
              {authMode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                    <Input
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</label>
                    <Select value={authForm.role} onValueChange={(val) => setAuthForm({ ...authForm, role: val })}>
                      <SelectItem value="BUYER">Buyer</SelectItem>
                      <SelectItem value="SELLER">Seller</SelectItem>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</label>
                <Input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              {authError && (
                <p className={`text-xs ${authError.includes("Registered") ? "text-primary" : "text-destructive"}`}>
                  {authError}
                </p>
              )}
              <Button type="submit" className="w-full mt-4 h-11 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                {authMode === "login" ? <><LogIn className="h-4 w-4 mr-2" /> Sign In</> : <><UserPlus className="h-4 w-4 mr-2" /> Create Account</>}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center pt-2">
            <button
              onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary"
            >
              {authMode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
            </button>
          </CardFooter>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-primary to-purple-400">Buzzin</span>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant="secondary" className="hidden sm:flex gap-1.5">
              <Package className="h-3 w-3" />
              {totalElements} products
            </Badge>
            {(user.role === "BUYER" || user.role === "USER") && (
              <Button variant="outline" size="icon" className="relative group" onClick={() => setCartOpen(true)}>
                <ShoppingBag className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                {cart?.items?.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] min-w-[18px] h-5 flex items-center justify-center bg-primary">
                    {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            )}
            <span className="hidden sm:block text-sm text-muted-foreground">Hi, {user.username}</span>
            <Button variant="ghost" size="icon" onClick={() => { setUser(null); setCart(null); localStorage.removeItem("shopuser"); }} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Carousel */}
      <div className="relative w-full h-[400px] sm:h-[500px] overflow-hidden mb-8 group bg-muted">
        {HERO_IMAGES.map((img, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            <img src={img} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-center z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <div className="max-w-lg space-y-6 animate-in slide-in-from-bottom-8 duration-700 fade-in-0">
              <Badge className="bg-primary/20 text-primary border-primary/30 py-1.5 px-4 text-xs tracking-wider rounded-full backdrop-blur-sm">NEW TRENDS</Badge>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white drop-shadow-xl leading-tight">
                Discover the <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-300 drop-shadow-none">Extraordinary.</span>
              </h1>
              <p className="text-lg text-gray-300 font-medium drop-shadow-md max-w-md">
                Explore top trends, exclusive deals, and premium products curated just for you at Buzzin.
              </p>
              <div className="pt-2">
                <Button size="lg" className="rounded-full shadow-[0_0_20px_rgba(233,30,99,0.4)] hover:shadow-[0_0_30px_rgba(233,30,99,0.7)] hover:-translate-y-1 transition-all px-8 text-md font-bold" onClick={() => window.scrollTo({top: 500, behavior: 'smooth'})}>
                  Start Shopping
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
          {HERO_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? "w-8 bg-primary shadow-[0_0_10px_theme(colors.primary.DEFAULT)]" : "w-2 bg-white/40 hover:bg-white/70"}`} />
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your product catalogue</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy} placeholder="Sort by">
                <SelectItem value="id">Date added</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price">Price</SelectItem>
              </Select>
            </div>
            <Select value={direction} onValueChange={setDirection} placeholder="Order">
              <SelectItem value="ASC">Ascending</SelectItem>
              <SelectItem value="DESC">Descending</SelectItem>
            </Select>

            {(user.role === "ADMIN" || user.role === "SELLER") && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Product
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>Fill in the details for the new product.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product Name</label>
                    <Input
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="e.g. Wireless Headphones"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                    <Input
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Brief product description"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProductImage(e.target.files[0])}
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer"
                    />
                  </div>
                  {addError && <p className="text-xs text-destructive">{addError}</p>}
                  <Button type="submit" className="w-full" disabled={adding}>
                    {adding ? "Adding..." : "Add Product"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-5 rounded-2xl bg-muted">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground/70">
              {search ? `No results for "${search}"` : "Add your first product to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden group hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-primary/10 transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-md">
                <div className="relative overflow-hidden bg-muted aspect-square">
                  {product.image && !product.image.includes("placeholder.com") ? (
                    <>
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                      />
                      <div className="absolute inset-0 hidden flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8 opacity-40" />
                        <span className="text-xs opacity-60">Image not available</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8 opacity-40" />
                      <span className="text-xs opacity-60">No image available</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {(user.role === "ADMIN" || (user.role === "SELLER" && product.seller?.username === user.username)) && (
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive scale-90 group-hover:scale-100"
                      title="Delete product"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(user.role === "BUYER" || user.role === "USER") && (
                    <button
                      onClick={() => addToCart(product.id)}
                      className="absolute bottom-3 right-3 p-2 rounded-lg bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary scale-90 group-hover:scale-100 shadow-lg"
                      title="Add to cart"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <CardHeader className="pb-1">
                  <CardTitle className="text-base line-clamp-1">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                </CardContent>
                <CardFooter className="pt-3 justify-between items-center">
                  <div className="flex items-center gap-1 text-primary font-bold text-lg">
                    <Tag className="h-3.5 w-3.5" />
                    ₹{product.price.toLocaleString()}
                  </div>
                  <Badge variant="secondary">ID #{product.id}</Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i).map((pg) => (
              <Button
                key={pg}
                variant={pg === currentPage ? "default" : "outline"}
                size="icon"
                onClick={() => setCurrentPage(pg)}
                className="min-w-[36px]"
              >
                {pg + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Shopping Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Your Cart</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)}>
                <span className="text-xl leading-none">&times;</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {(!cart || !cart.items || cart.items.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <Package className="h-12 w-12 opacity-20" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center bg-muted/30 p-3 rounded-xl border border-border/50">
                    <div className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                      {item.product.image && !item.product.image.includes("placeholder.com") ? (
                         <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none" }} />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 opacity-40"/></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                      <div className="text-primary font-bold mt-0.5 text-sm">₹{item.product.price.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-background rounded-lg border border-border p-1">
                      <button onClick={() => updateCartItemQuantity(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                        -
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartItemQuantity(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart && cart.items && cart.items.length > 0 && (
              <div className="px-6 py-6 border-t border-border bg-muted/50">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-medium text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    ₹{cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={clearCart} className="w-full">
                    Clear Cart
                  </Button>
                  <Button className="w-full" onClick={handleCheckout}>
                    Checkout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

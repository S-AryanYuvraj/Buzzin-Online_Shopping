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

const API = "http://localhost:8080";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

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
        name: "ShopAdmin",
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <Card className="w-full max-w-md relative">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-2xl bg-primary/20">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">ShopAdmin</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {authMode === "login" ? "Sign in to your account" : "Create a new account"}
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
              <Button type="submit" className="w-full mt-2">
                {authMode === "login" ? <><LogIn className="h-4 w-4" /> Sign In</> : <><UserPlus className="h-4 w-4" /> Create Account</>}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center pt-0">
            <button
              onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {authMode === "login" ? "Don't have an account? Register" : "Already have an account? Sign in"}
            </button>
          </CardFooter>
        </Card>
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
            <span className="font-bold text-lg tracking-tight">ShopAdmin</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden group">
                <div className="relative overflow-hidden bg-muted aspect-square">
                  {product.image && !product.image.includes("placeholder.com") ? (
                    <>
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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

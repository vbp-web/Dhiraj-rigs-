import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  ShoppingCart, Menu, X, Search, User, ChevronRight, 
  MapPin, Phone, Mail, Star, Package, Trash2, Plus, Minus,
  Settings, CreditCard, LogOut, Truck, PenTool, LayoutDashboard
} from 'lucide-react';

// --- TYPES & INTERFACES ---

type Category = 'Rigs' | 'Parts' | 'Tools' | 'Accessories';

interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  specs: string[];
  image: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}

interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  date: string;
  shippingAddress: string;
}

// --- MOCK DATABASE & BACKEND SERVICES ---

const SEED_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'DEW 2500 DTH Rig',
    category: 'Rigs',
    price: 4500000,
    description: 'Heavy-duty DTH drilling rig capable of 2500 ft depth. Mounted on 6x6 truck chassis for extreme terrain.',
    specs: ['Depth: 2500 ft', 'Hole Dia: 6.5 - 10 inch', 'Compressor: 1100 CFM', 'Engine: 350 HP'],
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800',
    stock: 2
  },
  {
    id: 'p2',
    name: 'DEW 1000 Tractor Mount',
    category: 'Rigs',
    price: 1800000,
    description: 'Compact and versatile tractor mounted rig for water well drilling in agricultural areas.',
    specs: ['Depth: 1000 ft', 'Mount: Tractor', 'Auto Rod Handling', 'Cost-effective'],
    image: 'https://images.unsplash.com/photo-1579762263309-913a6470295f?auto=format&fit=crop&q=80&w=800',
    stock: 5
  },
  {
    id: 'p3',
    name: 'Industrial Mud Pump',
    category: 'Parts',
    price: 350000,
    description: 'High pressure mud pump for rotary drilling applications. Durable liner and piston design.',
    specs: ['Flow: 1500 LPM', 'Pressure: 30 Bar', 'Weight: 450 kg'],
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
    stock: 12
  },
  {
    id: 'p4',
    name: 'DTH Hammer 6"',
    category: 'Tools',
    price: 45000,
    description: 'Premium steel DTH hammer for hard rock formations. Compatible with standard bits.',
    specs: ['Size: 6 inch', 'Thread: API Reg', 'Air Consumption: Low'],
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    stock: 50
  },
  {
    id: 'p5',
    name: 'Drill Rod (15ft)',
    category: 'Accessories',
    price: 12000,
    description: 'Friction welded drill pipes made from seamless alloy steel tubes.',
    specs: ['Length: 15 ft', 'OD: 76mm', 'Thickness: 6.5mm'],
    image: 'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&q=80&w=800',
    stock: 200
  },
  {
    id: 'p6',
    name: 'Rotary Gear Box',
    category: 'Parts',
    price: 125000,
    description: 'Heavy duty rotary head gearbox for high torque applications.',
    specs: ['Torque: 4500 Nm', 'Ratio: 1:4', 'Oil Capacity: 15L'],
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=800',
    stock: 8
  }
];

class MockBackend {
  static init() {
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify(SEED_PRODUCTS));
    }
    if (!localStorage.getItem('orders')) {
      localStorage.setItem('orders', JSON.stringify([]));
    }
    // Seed Admin
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([{
        id: 'admin', name: 'Dhiraj Admin', email: 'admin@dhirajrigs.com', password: 'admin', role: 'admin'
      }]));
    }
  }

  static getProducts(): Product[] {
    return JSON.parse(localStorage.getItem('products') || '[]');
  }

  static saveProduct(product: Product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    localStorage.setItem('products', JSON.stringify(products));
  }

  static deleteProduct(id: string) {
    const products = this.getProducts().filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(products));
  }

  static createOrder(order: Order) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.unshift(order);
    localStorage.setItem('orders', JSON.stringify(orders));
  }

  static getOrders(): Order[] {
    return JSON.parse(localStorage.getItem('orders') || '[]');
  }
}

MockBackend.init();

// --- STATE MANAGEMENT (CONTEXT) ---

// 1. Auth Context
const AuthContext = createContext<{
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
}>({ user: null, login: async () => false, register: async () => false, logout: () => {} });

// 2. Cart Context
const CartContext = createContext<{
  items: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
}>({ items: [], addToCart: () => {}, removeFromCart: () => {}, updateQuantity: () => {}, clearCart: () => {}, cartTotal: 0 });

// --- COMPONENTS ---

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

const Button = ({ 
  children, variant = 'primary', className = '', onClick, type = 'button', disabled = false 
}: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'outline' | 'danger', className?: string, onClick?: () => void, type?: 'button'|'submit', disabled?: boolean }) => {
  const baseStyle = "px-6 py-2 rounded font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-royal-800 hover:bg-royal-900 text-white shadow-lg shadow-royal-900/20",
    secondary: "bg-eng-400 hover:bg-eng-500 text-royal-900 shadow-lg shadow-eng-400/20",
    outline: "border-2 border-royal-800 text-royal-800 hover:bg-royal-50",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-royal-800 focus:border-transparent outline-none transition-all"
    />
  </div>
);

// --- SECTIONS & PAGES ---

const Navbar = ({ setView, cartCount, user, onLogout }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-royal-900 text-white shadow-xl">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('home')}>
            <PenTool className="h-8 w-8 text-eng-400" />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">DHIRAJ RIGS</span>
              <span className="text-[10px] text-gray-300 tracking-widest">ENGINEERING EXCELLENCE</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => setView('home')} className="hover:text-eng-400 transition-colors">Home</button>
            <button onClick={() => setView('shop')} className="hover:text-eng-400 transition-colors">Machines & Parts</button>
            <button onClick={() => setView('about')} className="hover:text-eng-400 transition-colors">About</button>
            <button onClick={() => setView('contact')} className="hover:text-eng-400 transition-colors">Contact</button>
          </div>

          {/* Icons */}
          <div className="hidden md:flex items-center space-x-6">
            <button onClick={() => setView('shop')}><Search className="h-5 w-5 hover:text-eng-400" /></button>
            <div className="relative cursor-pointer" onClick={() => setView('cart')}>
              <ShoppingCart className="h-5 w-5 hover:text-eng-400" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-eng-400 text-royal-900 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </div>
            
            {user ? (
              <div className="relative group">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <User className="h-5 w-5 text-eng-400" />
                  <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
                </div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-xl py-2 hidden group-hover:block text-gray-800 border border-gray-100">
                  {user.role === 'admin' && (
                    <button onClick={() => setView('admin')} className="block w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center">
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Admin
                    </button>
                  )}
                  <button onClick={() => setView('orders')} className="block w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center">
                    <Package className="h-4 w-4 mr-2" /> Orders
                  </button>
                  <button onClick={onLogout} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setView('login')} className="bg-eng-400 text-royal-900 px-4 py-1.5 rounded font-semibold text-sm hover:bg-eng-500 transition-colors">
                Login
              </button>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-royal-800 p-4 space-y-4">
          <button onClick={() => { setView('home'); setIsOpen(false); }} className="block w-full text-left">Home</button>
          <button onClick={() => { setView('shop'); setIsOpen(false); }} className="block w-full text-left">Shop</button>
          <button onClick={() => { setView('cart'); setIsOpen(false); }} className="block w-full text-left">Cart ({cartCount})</button>
          {user ? (
             <button onClick={onLogout} className="block w-full text-left text-eng-400">Logout</button>
          ) : (
             <button onClick={() => { setView('login'); setIsOpen(false); }} className="block w-full text-left text-eng-400">Login</button>
          )}
        </div>
      )}
    </nav>
  );
};

const Hero = ({ onCta }: { onCta: () => void }) => (
  <div className="relative bg-royal-900 text-white overflow-hidden">
    <div className="absolute inset-0 bg-black/50 z-10"></div>
    <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=2070')" }}></div>
    
    <div className="container mx-auto px-4 py-24 md:py-32 relative z-20 flex flex-col md:flex-row items-center">
      <div className="md:w-1/2 space-y-6">
        <div className="inline-block bg-eng-400 text-royal-900 px-4 py-1 rounded font-bold text-sm tracking-wide">
          ISO 9001:2015 CERTIFIED
        </div>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          Engineered for <br/> <span className="text-eng-400">Extreme Depths</span>
        </h1>
        <p className="text-gray-200 text-lg md:text-xl max-w-lg">
          India's leading manufacturer of Hydraulic Crawler Drills, Tractor Mounted Rigs, and Heavy Duty DTH Hammers.
        </p>
        <div className="flex space-x-4 pt-4">
          <Button variant="secondary" onClick={onCta} className="text-lg px-8 py-3">Explore Machinery</Button>
          <Button variant="outline" className="text-white border-white hover:bg-white hover:text-royal-900 text-lg px-8 py-3">Contact Sales</Button>
        </div>
      </div>
      
      {/* 3D Floating Card Effect for Feature Product */}
      <div className="hidden md:block md:w-1/2 relative mt-12 md:mt-0">
        <div className="relative w-80 h-96 mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 transform rotate-y-12 rotate-x-12 hover:rotate-0 transition-transform duration-500 shadow-2xl">
          <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800" className="w-full h-48 object-cover rounded mb-4" />
          <h3 className="text-xl font-bold text-eng-400">DEW 2500</h3>
          <p className="text-sm text-gray-300 mb-2">Flagship Deep Earth Water Rig</p>
          <div className="flex justify-between items-center mt-4">
             <span className="font-bold text-white">Top Seller</span>
             <div className="bg-eng-400 h-8 w-8 rounded-full flex items-center justify-center text-royal-900">
               <ChevronRight size={16} />
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ProductCard = ({ product, onAdd }: { product: Product, onAdd: (p: Product) => void }) => {
  return (
    <div className="group bg-white rounded-lg shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100 flex flex-col h-full">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        {product.stock < 5 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            Only {product.stock} left
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="text-xs text-gray-500 font-semibold uppercase mb-1">{product.category}</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xl font-bold text-royal-800">{formatPrice(product.price)}</span>
          <button 
            onClick={() => onAdd(product)}
            className="bg-royal-800 text-white p-2 rounded-full hover:bg-eng-400 hover:text-royal-900 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ShopPage = ({ products, onAdd }: { products: Product[], onAdd: (p: Product) => void }) => {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = products.filter(p => {
    const matchesCat = filter === 'All' || p.category === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Our Products</h2>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search equipment..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-full text-sm focus:ring-2 focus:ring-royal-800 outline-none w-full md:w-64"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['All', 'Rigs', 'Parts', 'Tools', 'Accessories'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === cat ? 'bg-royal-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No products found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
};

const CartPage = ({ setView }: { setView: (v: string) => void }) => {
  const { items, removeFromCart, updateQuantity, cartTotal } = useContext(CartContext);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <Button onClick={() => setView('shop')}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8">Shopping Cart</h2>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded bg-gray-100" />
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.category}</p>
                <div className="text-royal-800 font-semibold">{formatPrice(item.price)}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-gray-100 rounded">
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-gray-100 rounded">
                  <Plus size={16} />
                </button>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        
        <div className="lg:w-1/3">
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 sticky top-24">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({items.reduce((a,c) => a + c.quantity, 0)} items)</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (18% GST)</span>
                <span>{formatPrice(cartTotal * 0.18)}</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg text-royal-900">
                <span>Total</span>
                <span>{formatPrice(cartTotal * 1.18)}</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => setView('checkout')}>Proceed to Checkout</Button>
            <p className="text-xs text-gray-400 text-center mt-4">Secure Checkout via Stripe / Razorpay</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage = ({ setView }: { setView: (v: string) => void }) => {
  const { cartTotal, clearCart, items } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Success

  const handlePayment = async () => {
    setLoading(true);
    // Simulate Payment Gateway API Call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create Order
    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      userId: user?.id || 'guest',
      items: [...items],
      total: cartTotal * 1.18,
      status: 'Pending',
      date: new Date().toISOString(),
      shippingAddress: 'GIDC Kalol, Gujarat (Demo Address)'
    };
    MockBackend.createOrder(newOrder);
    
    setLoading(false);
    clearCart();
    setStep(3);
  };

  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Star className="h-10 w-10 fill-current" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Order Confirmed!</h2>
        <p className="text-gray-600 mb-8">Thank you for choosing Dhiraj Rigs. Your order ID is #ORD-{Math.floor(Math.random()*10000)}.</p>
        <Button onClick={() => setView('shop')}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-center mb-8 space-x-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-royal-800 text-white' : 'bg-gray-200'}`}>1</div>
        <div className="h-1 w-16 bg-gray-200"><div className={`h-full bg-royal-800 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div></div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-royal-800 text-white' : 'bg-gray-200'}`}>2</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4">Shipping Information</h3>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Dhiraj" />
              <Input label="Last Name" placeholder="Patel" />
            </div>
            <Input label="Company Name" placeholder="Dhiraj Rigs Pvt Ltd" />
            <Input label="Address" placeholder="GIDC Kalol" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" placeholder="Gandhinagar" />
              <Input label="Zip Code" placeholder="382721" />
            </div>
            <Input label="Phone" placeholder="+91 98765 43210" />
          </form>
          {step === 1 && (
             <Button className="mt-6 w-full" onClick={() => setStep(2)}>Continue to Payment</Button>
          )}
        </div>

        <div>
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
             <h4 className="font-bold mb-4 border-b pb-2">Order Review</h4>
             {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm mb-2">
                  <span>{item.name} x {item.quantity}</span>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
             ))}
             <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Total (Inc. GST)</span>
                <span>{formatPrice(cartTotal * 1.18)}</span>
             </div>
          </div>

          {step === 2 && (
            <div className="border border-gray-200 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4 flex items-center"><CreditCard className="mr-2"/> Payment Method</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center p-3 border border-royal-800 bg-blue-50 rounded cursor-pointer">
                  <div className="w-4 h-4 rounded-full border-4 border-royal-800 mr-3"></div>
                  <span className="font-medium">Credit / Debit Card (Razorpay)</span>
                </div>
                <div className="flex items-center p-3 border border-gray-200 rounded cursor-pointer opacity-50">
                   <div className="w-4 h-4 rounded-full border border-gray-300 mr-3"></div>
                   <span className="font-medium">Net Banking</span>
                </div>
              </div>

              <div className="bg-gray-100 p-4 rounded text-sm text-gray-500 mb-4">
                This is a simulated transaction. No real money will be deducted.
              </div>

              <Button 
                className="w-full flex justify-center items-center" 
                onClick={handlePayment} 
                disabled={loading}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : `Pay ${formatPrice(cartTotal * 1.18)}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setProducts(MockBackend.getProducts());
    setOrders(MockBackend.getOrders());
  };

  const handleDelete = (id: string) => {
    if(confirm('Are you sure?')) {
      MockBackend.deleteProduct(id);
      refreshData();
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    // Extract values (simplified for demo)
    const newProduct: Product = {
      id: editing ? editing.id : `p-${Date.now()}`,
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      category: (form.elements.namedItem('category') as HTMLSelectElement).value as Category,
      price: Number((form.elements.namedItem('price') as HTMLInputElement).value),
      description: 'New Product Description',
      specs: ['Standard Spec'],
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800', // Placeholder
      stock: Number((form.elements.namedItem('stock') as HTMLInputElement).value),
    };
    MockBackend.saveProduct(newProduct);
    setEditing(null);
    refreshData();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-royal-900">Admin Dashboard</h1>
      
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setTab('products')} 
          className={`px-4 py-2 rounded font-medium ${tab === 'products' ? 'bg-royal-800 text-white' : 'bg-gray-200'}`}
        >
          Manage Products
        </button>
        <button 
          onClick={() => setTab('orders')} 
          className={`px-4 py-2 rounded font-medium ${tab === 'orders' ? 'bg-royal-800 text-white' : 'bg-gray-200'}`}
        >
          View Orders
        </button>
      </div>

      {tab === 'products' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Product Inventory</h3>
            <Button onClick={() => setEditing({} as Product)}><Plus size={16} className="inline mr-1"/> Add New</Button>
          </div>

          {editing && (
            <div className="bg-gray-100 p-4 rounded mb-6 border border-gray-300">
               <h4 className="font-bold mb-2">{editing.id ? 'Edit Product' : 'New Product'}</h4>
               <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
                 <input name="name" defaultValue={editing.name} placeholder="Name" className="p-2 border rounded" required />
                 <select name="category" defaultValue={editing.category || 'Parts'} className="p-2 border rounded">
                    <option value="Rigs">Rigs</option>
                    <option value="Parts">Parts</option>
                    <option value="Tools">Tools</option>
                    <option value="Accessories">Accessories</option>
                 </select>
                 <input name="price" type="number" defaultValue={editing.price} placeholder="Price" className="p-2 border rounded" required />
                 <input name="stock" type="number" defaultValue={editing.stock} placeholder="Stock" className="p-2 border rounded" required />
                 <div className="col-span-2 flex gap-2">
                   <Button type="submit" variant="primary">Save</Button>
                   <Button onClick={() => setEditing(null)} variant="outline">Cancel</Button>
                 </div>
               </form>
            </div>
          )}

          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{p.category}</span></td>
                    <td className="p-4">{formatPrice(p.price)}</td>
                    <td className="p-4">{p.stock}</td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => setEditing(p)} className="text-blue-600 hover:text-blue-800"><PenTool size={16}/></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-bold mb-4">Customer Orders</h3>
          {orders.length === 0 ? <p className="text-gray-500">No orders placed yet.</p> : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded shadow border-l-4 border-royal-800">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-lg">{order.id}</span>
                      <span className="text-gray-500 text-sm ml-2">{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">{order.status}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Customer ID: {order.userId} | Amount: {formatPrice(order.total)}
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    {order.items.map(i => (
                      <div key={i.id}>{i.quantity}x {i.name}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AuthPage = ({ type, onSuccess }: { type: 'login' | 'register', onSuccess: () => void }) => {
  const { login, register } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let res;
    if (type === 'login') {
      res = await login(email, pass);
    } else {
      res = await register(name, email, pass);
    }
    
    if (res) {
      onSuccess();
    } else {
      setError('Authentication failed. Check credentials.');
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {type === 'login' ? 'Sign in to Dhiraj Rigs' : 'Create an Account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            {type === 'register' && (
              <Input label="Full Name" value={name} onChange={(e: any) => setName(e.target.value)} />
            )}
            <Input label="Email address" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
            <Input label="Password" type="password" value={pass} onChange={(e: any) => setPass(e.target.value)} />
          </div>

          <div>
            <Button type="submit" className="w-full">
              {type === 'login' ? 'Sign In' : 'Register'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- APP ROOT ---

const App = () => {
  const [view, setView] = useState('home');
  const [products, setProducts] = useState<Product[]>([]);
  
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Initial Load
    setProducts(MockBackend.getProducts());
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) setUser(JSON.parse(storedUser));
    const storedCart = localStorage.getItem('cart');
    if (storedCart) setCartItems(JSON.parse(storedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Auth Methods
  const authContext = useMemo(() => ({
    user,
    login: async (email: string, pass: string) => {
      // Mock Login
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const found = users.find((u: any) => u.email === email && u.password === pass);
      if (found) {
        setUser(found);
        localStorage.setItem('currentUser', JSON.stringify(found));
        return true;
      }
      return false;
    },
    register: async (name: string, email: string, pass: string) => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.find((u: any) => u.email === email)) return false;
      const newUser = { id: Date.now().toString(), name, email, password: pass, role: 'customer' };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      setUser(newUser as UserProfile);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      return true;
    },
    logout: () => {
      setUser(null);
      localStorage.removeItem('currentUser');
      setView('home');
    }
  }), [user]);

  // Cart Methods
  const cartContext = useMemo(() => ({
    items: cartItems,
    cartTotal: cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    addToCart: (product: Product, qty = 1) => {
      setCartItems(prev => {
        const exist = prev.find(i => i.id === product.id);
        if (exist) {
          return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
        }
        return [...prev, { ...product, quantity: qty }];
      });
    },
    removeFromCart: (id: string) => setCartItems(prev => prev.filter(i => i.id !== id)),
    updateQuantity: (id: string, qty: number) => {
      if (qty < 1) return;
      setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    },
    clearCart: () => setCartItems([])
  }), [cartItems]);

  return (
    <AuthContext.Provider value={authContext}>
      <CartContext.Provider value={cartContext}>
        <div className="flex flex-col min-h-screen">
          <Navbar 
            setView={setView} 
            cartCount={cartItems.reduce((a,c) => a + c.quantity, 0)} 
            user={user}
            onLogout={authContext.logout}
          />
          
          <main className="flex-grow">
            {view === 'home' && (
              <>
                <Hero onCta={() => setView('shop')} />
                <div className="py-16 bg-white">
                  <div className="container mx-auto px-4 text-center mb-12">
                     <h2 className="text-3xl font-bold mb-4">Why Choose Dhiraj Rigs?</h2>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                       <div className="p-6">
                         <div className="bg-eng-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-royal-800"><Settings size={32}/></div>
                         <h3 className="font-bold text-xl mb-2">Precision Engineering</h3>
                         <p className="text-gray-600">CNC machined components ensuring 100% accuracy and durability in the field.</p>
                       </div>
                       <div className="p-6">
                         <div className="bg-eng-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-royal-800"><Truck size={32}/></div>
                         <h3 className="font-bold text-xl mb-2">Pan-India Support</h3>
                         <p className="text-gray-600">Service network across major industrial hubs including Gujarat, Rajasthan, and MP.</p>
                       </div>
                       <div className="p-6">
                         <div className="bg-eng-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-royal-800"><Phone size={32}/></div>
                         <h3 className="font-bold text-xl mb-2">24/7 Technical Support</h3>
                         <p className="text-gray-600">Dedicated engineering team to assist with on-site troubleshooting.</p>
                       </div>
                     </div>
                  </div>
                </div>
                <div className="bg-gray-50 py-16">
                   <div className="container mx-auto px-4">
                     <h2 className="text-3xl font-bold mb-8 text-center">Featured Machines</h2>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {products.slice(0, 3).map(p => (
                         <ProductCard key={p.id} product={p} onAdd={cartContext.addToCart} />
                       ))}
                     </div>
                   </div>
                </div>
              </>
            )}
            
            {view === 'shop' && <ShopPage products={products} onAdd={cartContext.addToCart} />}
            {view === 'cart' && <CartPage setView={setView} />}
            {view === 'checkout' && <CheckoutPage setView={setView} />}
            {view === 'login' && <AuthPage type="login" onSuccess={() => setView('home')} />}
            {view === 'register' && <AuthPage type="register" onSuccess={() => setView('home')} />}
            {view === 'admin' && (user?.role === 'admin' ? <AdminDashboard /> : <div className="p-10 text-center text-red-500">Access Denied</div>)}
            
            {view === 'contact' && (
              <div className="container mx-auto px-4 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <h2 className="text-4xl font-bold mb-6 text-royal-900">Get in Touch</h2>
                    <p className="text-lg text-gray-600 mb-8">
                      Looking for a custom rig configuration or bulk spare parts? Visit our factory or drop us a line.
                    </p>
                    <div className="space-y-6">
                       <div className="flex items-center space-x-4">
                         <MapPin className="text-eng-400 h-6 w-6" />
                         <span>Plot No. 45, GIDC Industrial Estate, Kalol, Gandhinagar, Gujarat - 382721</span>
                       </div>
                       <div className="flex items-center space-x-4">
                         <Phone className="text-eng-400 h-6 w-6" />
                         <span>+91 98250 12345</span>
                       </div>
                       <div className="flex items-center space-x-4">
                         <Mail className="text-eng-400 h-6 w-6" />
                         <span>sales@dhirajrigs.com</span>
                       </div>
                    </div>
                  </div>
                  <form className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-royal-800">
                    <h3 className="text-xl font-bold mb-4">Send Inquiry</h3>
                    <Input label="Name" placeholder="Your Name" />
                    <Input label="Email" placeholder="your@email.com" />
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Message</label>
                      <textarea className="w-full border rounded p-2 h-32" placeholder="Tell us your requirements..."></textarea>
                    </div>
                    <Button className="w-full">Send Message</Button>
                  </form>
                </div>
              </div>
            )}
          </main>

          <footer className="bg-ind-900 text-gray-400 py-12">
             <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
               <div>
                 <div className="flex items-center space-x-2 mb-4 text-white">
                    <PenTool className="h-6 w-6 text-eng-400" />
                    <span className="font-bold text-xl">DHIRAJ RIGS</span>
                 </div>
                 <p className="text-sm">Premium drilling solutions for the modern world. Manufactured with pride in Gujarat, India.</p>
               </div>
               <div>
                 <h4 className="text-white font-bold mb-4">Products</h4>
                 <ul className="space-y-2 text-sm">
                   <li><button onClick={() => setView('shop')} className="hover:text-eng-400">DTH Rigs</button></li>
                   <li><button onClick={() => setView('shop')} className="hover:text-eng-400">Mud Pumps</button></li>
                   <li><button onClick={() => setView('shop')} className="hover:text-eng-400">Drilling Tools</button></li>
                 </ul>
               </div>
               <div>
                 <h4 className="text-white font-bold mb-4">Support</h4>
                 <ul className="space-y-2 text-sm">
                   <li><button className="hover:text-eng-400">Download Catalog</button></li>
                   <li><button onClick={() => setView('contact')} className="hover:text-eng-400">Service Request</button></li>
                   <li><button className="hover:text-eng-400">Warranty Policy</button></li>
                 </ul>
               </div>
               <div>
                 <h4 className="text-white font-bold mb-4">Newsletter</h4>
                 <div className="flex">
                   <input type="email" placeholder="Email" className="bg-ind-800 px-4 py-2 rounded-l text-white outline-none w-full" />
                   <button className="bg-eng-400 text-royal-900 px-4 py-2 rounded-r font-bold hover:bg-eng-500">Go</button>
                 </div>
               </div>
             </div>
             <div className="container mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center text-xs">
               © {new Date().getFullYear()} Dhiraj Rigs Pvt. Ltd. All rights reserved.
             </div>
          </footer>
        </div>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, Minus, Plus, Search, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';
import { faro } from './faro';
import './styles.css';

const products = [
  {
    id: 'field-pack',
    name: 'Field Pack 24L',
    category: 'Carry',
    price: 148,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'trail-bottle',
    name: 'Trail Bottle',
    category: 'Hydration',
    price: 38,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'camp-light',
    name: 'Camp Light No. 3',
    category: 'Lighting',
    price: 84,
    image: 'https://images.unsplash.com/photo-1521917441209-e886f0404a7b?auto=format&fit=crop&w=900&q=85',
  },
];

type Cart = Record<string, number>;

function App() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');

  const visibleProducts = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
  const itemCount = Object.values(cart).reduce((sum, value) => sum + value, 0);
  const total = products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0);

  const addItem = (id: string) => {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    setNotice('Added to your field kit');
    console.info('Product added to cart', { productId: id });
    faro.api.pushEvent('demo.cart.item_added', { productId: id });
  };

  const changeQuantity = (id: string, change: number) => {
    setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + change) }));
  };

  const checkout = () => {
    console.error('Demo checkout inventory conflict', { cartItems: itemCount });
    faro.api.pushEvent('demo.checkout.failed', { reason: 'inventory_conflict', cartItems: String(itemCount) });
    setNotice('Demo checkout paused: one item needs a stock check');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Northstar Supply home">
          <span className="brand-mark">N</span>
          <span>Northstar Supply</span>
        </a>
        <nav aria-label="Store navigation">
          <a href="#collection">Collection</a>
          <a href="#journal">Field notes</a>
        </nav>
        <button className="icon-button cart-button" onClick={() => setCartOpen(true)} aria-label="Open cart">
          <ShoppingBag size={20} />
          <span>{itemCount}</span>
        </button>
      </header>

      <main id="top">
        <section className="intro">
          <div>
            <p className="eyebrow">
              <Sparkles size={15} /> Summer field edit
            </p>
            <h1>Equipment for slower miles.</h1>
            <p>Considered tools for day walks, quiet camps, and the useful space between departure and return.</p>
          </div>
          <img src={products[0].image} alt="Olive field pack resting outdoors" />
        </section>

        <section className="collection" id="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Current collection</p>
              <h2>Field-tested essentials</h2>
            </div>
            <label className="search-box">
              <Search size={18} />
              <span className="sr-only">Search products</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search gear" />
            </label>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product" key={product.id}>
                <div className="product-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-copy">
                  <p>{product.category}</p>
                  <h3>{product.name}</h3>
                  <div>
                    <span>${product.price}</span>
                    <button onClick={() => addItem(product.id)}>
                      Add <Plus size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="journal" id="journal">
          <div>
            <p className="eyebrow">Field note 08</p>
            <h2>Pack less. Notice more.</h2>
          </div>
          <p>
            A useful kit earns its place quietly. We choose repairable materials, familiar forms, and details that
            improve after a season outside.
          </p>
        </section>

        <section className="newsletter">
          <div>
            <h2>Notes from the trail</h2>
            <p>Occasional product updates and practical field notes.</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setNotice('You are on the field notes list');
              faro.api.pushEvent('demo.newsletter.joined');
            }}
          >
            <label>
              <span className="sr-only">Email address</span>
              <input
                className="sensitive"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button type="submit">
              Join <Check size={17} />
            </button>
          </form>
        </section>
      </main>

      {notice && (
        <button className="toast" onClick={() => setNotice('')}>
          <Check size={17} />
          {notice}
          <X size={16} />
        </button>
      )}

      {cartOpen && (
        <div className="scrim" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()} aria-label="Shopping cart">
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">Your field kit</p>
                <h2>{itemCount} items</h2>
              </div>
              <button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close cart">
                <X />
              </button>
            </div>
            <div className="cart-lines">
              {products
                .filter((product) => cart[product.id])
                .map((product) => (
                  <div className="cart-line" key={product.id}>
                    <img src={product.image} alt="" />
                    <div>
                      <h3>{product.name}</h3>
                      <p>${product.price}</p>
                      <div className="quantity">
                        <button
                          onClick={() => changeQuantity(product.id, -1)}
                          aria-label={`Remove one ${product.name}`}
                        >
                          <Minus size={15} />
                        </button>
                        <span>{cart[product.id]}</span>
                        <button onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}>
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => setCart((current) => ({ ...current, [product.id]: 0 }))}
                      aria-label={`Remove ${product.name}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              {!itemCount && (
                <div className="empty-cart">
                  <ShoppingBag />
                  <h3>Your field kit is empty</h3>
                  <p>Add an essential from the collection.</p>
                </div>
              )}
            </div>
            <div className="cart-footer">
              <div>
                <span>Subtotal</span>
                <strong>${total}</strong>
              </div>
              <button className="checkout" disabled={!itemCount} onClick={checkout}>
                Demo checkout
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

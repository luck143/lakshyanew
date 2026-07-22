// apps/webstore/app/layout.tsx
import './globals.css';
export const metadata = {
  title: 'Lakshya — Learn Engineering, Books & Courses',
  description: 'Books, courses and articles on modern software engineering — a metadata-driven learning platform.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="bar">
            <a className="brand" href="/"><span className="dot" />Lakshya</a>
            <nav className="nav">
              <a href="/products">Shop</a>
              <a href="/blog">Blog</a>
              <a href="/products?cat=books">Books</a>
              <a href="/products?cat=courses">Courses</a>
            </nav>
            <a className="cart" href="/cart">Cart</a>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container">
            <div>
              <div className="brand"><span className="dot" />Lakshya</div>
              <p style={{ marginTop: 12, maxWidth: 280, fontSize: 14 }}>Practical books and courses for engineers who want to build, not just read.</p>
            </div>
            <div>
              <h4>Shop</h4>
              <a href="/products?cat=books">Books</a>
              <a href="/products?cat=courses">Courses</a>
              <a href="/products?cat=bundles">Bundles</a>
            </div>
            <div>
              <h4>Learn</h4>
              <a href="/blog">Blog</a>
              <a href="/products">All products</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="/">About</a>
              <a href="/">Contact</a>
            </div>
            <div className="copy">© {new Date().getFullYear()} Lakshya. A metadata-driven learning platform.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-600">
        <p>© {new Date().getFullYear()} EventHub</p>
        <nav className="flex flex-wrap gap-4 justify-center">
          <Link href="/impressum" className="hover:text-neutral-900 transition-colors">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-neutral-900 transition-colors">Datenschutz</Link>
          <Link href="/kontakt" className="hover:text-neutral-900 transition-colors">Kontakt</Link>
        </nav>
      </div>
    </footer>
  );
}

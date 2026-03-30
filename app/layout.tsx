import type {Metadata} from 'next';
import { Noto_Serif, Manrope } from 'next/font/google';
import './globals.css'; // Global styles

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-headline',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Jungraf | Artes Gráficas',
  description: 'Excelência em Artes Gráficas e Tipografia Portuguesa desde 1921.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt" className={`${notoSerif.variable} ${manrope.variable}`}>
      <body suppressHydrationWarning className="font-body antialiased">{children}</body>
    </html>
  );
}

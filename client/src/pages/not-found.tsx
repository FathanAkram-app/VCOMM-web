import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="border-2 border-primary inline-flex rounded-md p-2 mx-auto">
          <h1 className="text-6xl font-bold text-primary">404</h1>
        </div>
        
        <h2 className="text-2xl font-bold">Halaman Tidak Ditemukan</h2>
        
        <p className="text-muted-foreground">
          Halaman yang Anda cari tidak dapat ditemukan atau telah dihapus.
        </p>
        
        <Button asChild className="mt-6">
          <Link href="/">
            Kembali ke Halaman Utama
          </Link>
        </Button>
      </div>
    </div>
  );
}
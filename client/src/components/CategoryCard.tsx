import { Link } from "wouter";
import { type Category } from "@shared/schema";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/categories?id=${category.id}`} className="group relative block aspect-square overflow-hidden rounded-sm">
      <img 
        src={category.imageUrl} 
        alt={category.name}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3 className="text-white font-serif text-2xl font-medium tracking-wide">
          {category.name}
        </h3>
        <div className="h-0.5 w-0 bg-white/80 group-hover:w-16 transition-all duration-500 ease-out mt-2" />
      </div>
    </Link>
  );
}

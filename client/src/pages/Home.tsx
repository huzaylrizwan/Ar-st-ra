import { Layout } from "@/components/Layout";
import { useCategories } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { data: categories, isLoading: isCategoriesLoading } = useCategories();
  const { data: featuredProducts, isLoading: isProductsLoading } = useProducts();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        {/* Unsplash luxury living room */}
        <img 
          src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop" 
          alt="Luxury Interior" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        
        <div className="relative container mx-auto h-full flex items-center px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl text-white space-y-6"
          >
            <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight">
              Timeless Elegance for Modern Living
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-light max-w-md">
              Discover a curated collection of furniture that defines sophistication. Designed for those who appreciate the finer details.
            </p>
            <div className="pt-4">
              <Link href="/categories">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-8 py-6 text-sm tracking-widest uppercase font-bold">
                  Explore Collection
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="font-serif text-3xl md:text-4xl">Curated Collections</h2>
            <p className="text-muted-foreground">Each piece tells a story of craftsmanship and luxury.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isCategoriesLoading ? (
              [1, 2, 3].map((i) => <div key={i} className="aspect-square bg-muted animate-pulse" />)
            ) : (
              categories?.filter(c => !c.isHidden).slice(0, 3).map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Philosophy / About Block */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative aspect-[4/3]">
              {/* Unsplash craftsman working on wood */}
              <img 
                src="https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=800&q=80" 
                alt="Craftsmanship" 
                className="w-full h-full object-cover rounded-sm shadow-xl"
              />
            </div>
            <div className="order-1 md:order-2 space-y-6 md:pl-12">
              <h2 className="font-serif text-3xl md:text-4xl leading-tight">Designed for the Senses, <br/>Built for Generations</h2>
              <p className="text-muted-foreground leading-relaxed">
                We believe furniture is more than just functional objects; it is the soul of a home. Our pieces are crafted with the finest materials—solid hardwoods, full-grain leathers, and premium textiles—to ensure they age beautifully.
              </p>
              <div className="flex gap-8 pt-4">
                <div>
                  <h4 className="font-serif text-2xl font-bold text-primary">100%</h4>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Handmade</p>
                </div>
                <div>
                  <h4 className="font-serif text-2xl font-bold text-primary">25+</h4>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Year Warranty</p>
                </div>
              </div>
              <Button variant="link" className="px-0 text-primary hover:text-primary/80 uppercase tracking-widest text-xs font-bold mt-4">
                Read Our Story <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl mb-2">New Arrivals</h2>
              <p className="text-muted-foreground">The latest additions to our catalog.</p>
            </div>
            <Link href="/categories">
              <Button variant="outline" className="hidden sm:flex rounded-none border-foreground/20 hover:border-foreground hover:bg-transparent">
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {isProductsLoading ? (
              [1, 2, 3, 4].map((i) => <div key={i} className="aspect-[4/5] bg-muted animate-pulse" />)
            ) : (
              featuredProducts?.filter(p => !p.isHidden).slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/categories">
              <Button variant="outline" className="w-full rounded-none">View All</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* AR Feature Teaser */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <h2 className="font-serif text-3xl md:text-5xl mb-6">Experience It In Your Home</h2>
          <p className="text-lg opacity-90 mb-10 leading-relaxed">
            Unsure if it fits? Use our Augmented Reality feature to visualize our pieces directly in your space using just your smartphone. No app required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/categories">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-none px-8 font-bold tracking-wider uppercase">
                Browse with AR
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

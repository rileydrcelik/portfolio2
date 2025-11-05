'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  sizes?: string[];
  colors?: string[];
  inventory: number;
  isFeatured: boolean;
}

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Shop Collection
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Wearable art and merchandise inspired by my creative work.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              className="group relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link href={`/shop/${product.slug}`}>
                <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-200">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    width={400}
                    height={225}
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.isFeatured && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                        Featured
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{product.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{product.category}</span>
                    <span className="text-xs text-gray-500">
                      {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}






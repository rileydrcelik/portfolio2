'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function About() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div className="lg:pr-8 lg:pt-4">
            <div className="lg:max-w-lg">
              <motion.h2
                className="text-base font-semibold leading-7 text-blue-600"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                About Me
              </motion.h2>
              <motion.p
                className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                Creative Technologist
              </motion.p>
              <motion.p
                className="mt-6 text-lg leading-8 text-gray-600"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                I'm a multidisciplinary creative who bridges the gap between technology and art. 
                With a passion for both digital innovation and traditional craftsmanship, I create 
                experiences that are both functional and beautiful.
              </motion.p>
              <motion.p
                className="mt-6 text-lg leading-8 text-gray-600"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
              >
                From composing music to developing web applications, each project represents 
                a unique exploration of creative possibilities. I believe in the power of 
                technology to amplify human creativity and expression.
              </motion.p>
              <motion.dl
                className="mt-10 max-w-xl space-y-8 border-t border-gray-900/10 pt-10 lg:max-w-none"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <div className="flex flex-col gap-y-3">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    Specializations
                  </dt>
                  <dd className="text-base leading-7 text-gray-600">
                    Web Development, Digital Art, Music Production, UI/UX Design
                  </dd>
                </div>
                <div className="flex flex-col gap-y-3">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    Technologies
                  </dt>
                  <dd className="text-base leading-7 text-gray-600">
                    React, Next.js, TypeScript, Node.js, Adobe Creative Suite, Logic Pro
                  </dd>
                </div>
              </motion.dl>
            </div>
          </div>
          <motion.div
            className="flex items-start justify-end lg:order-first"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Image
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face"
              alt="Riley Drcelik"
              width={400}
              height={500}
              className="w-[48rem] max-w-none rounded-xl shadow-xl ring-1 ring-gray-400/10 sm:w-[57rem]"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

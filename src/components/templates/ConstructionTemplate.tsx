'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HardHat } from 'lucide-react';

interface ConstructionTemplateProps {
  scriptUrl: string;
}

export default function ConstructionTemplate({ scriptUrl }: ConstructionTemplateProps) {
  useEffect(() => {
    if (scriptUrl) {
      const script = document.createElement('script');
      script.src = `${scriptUrl}?v=${Date.now()}`;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        document.querySelectorAll('[data-aw]').forEach((el) => el.remove());
        (window as unknown as Record<string, unknown>).__WIDGET_CSS__ = undefined;
        (window as unknown as Record<string, unknown>).__WIDGET_CONFIG__ = undefined;
      };
    }
  }, [scriptUrl]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2 text-white shadow-lg">
        <span className="text-sm font-medium">Demo Mode</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="fixed z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                <HardHat className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">BuildPro</span>
                <p className="text-xs text-gray-500">CONSTRUCTION CO.</p>
              </div>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <a href="#projects" className="text-gray-300 transition-colors hover:text-orange-500">
                Projects
              </a>
              <a href="#services" className="text-gray-300 transition-colors hover:text-orange-500">
                Services
              </a>
              <a href="#about" className="text-gray-300 transition-colors hover:text-orange-500">
                About
              </a>
              <a href="#contact" className="text-gray-300 transition-colors hover:text-orange-500">
                Contact
              </a>
              <button className="rounded bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-2.5 font-medium text-white transition-all hover:shadow-lg hover:shadow-orange-500/30">
                Get Quote
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center pt-20">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1920&q=80"
            alt="Construction Site"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/70" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-orange-500">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-sm font-medium">25+ Years of Excellence</span>
            </div>
            <h1 className="mb-6 text-5xl leading-tight font-bold text-white lg:text-7xl">
              Building
              <span className="text-orange-500"> Dreams </span>
              Into Reality
            </h1>
            <p className="mb-8 text-xl leading-relaxed text-gray-400">
              From concept to completion, we deliver exceptional construction services with unmatched quality, safety,
              and innovation. Your vision, our expertise.
            </p>
            <div className="mb-12 flex flex-wrap gap-4">
              <button className="flex items-center gap-2 rounded bg-gradient-to-r from-orange-500 to-amber-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:shadow-xl hover:shadow-orange-500/30">
                Start Your Project
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button className="rounded border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
                View Projects
              </button>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {[
                { number: '500+', label: 'Projects Completed' },
                { number: '$2B+', label: 'Project Value' },
                { number: '98%', label: 'Client Satisfaction' },
              ].map((stat, i) => (
                <div key={i} className="border-l-2 border-orange-500 pl-4">
                  <p className="text-4xl font-bold text-white">{stat.number}</p>
                  <p className="text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="absolute top-1/2 right-20 hidden -translate-y-1/2 lg:block">
          <div className="relative">
            <div className="h-80 w-64 rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-6 shadow-2xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/20">
                <svg className="h-7 w-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Safety First</h3>
              <p className="text-sm text-gray-400">Zero incidents policy with OSHA certified practices</p>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-gray-800 bg-gray-600" />
                  ))}
                </div>
                <span className="text-sm text-gray-500">1000+ Workers</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 flex h-20 w-64 items-center gap-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 p-4 shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Licensed & Insured</p>
                <p className="text-sm text-white/70">Fully certified team</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-gray-800 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="font-semibold text-orange-500">WHAT WE DO</span>
            <h2 className="mt-3 text-4xl font-bold text-white lg:text-5xl">Our Construction Services</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: '🏢',
                title: 'Commercial Buildings',
                desc: 'Office complexes, retail spaces, and industrial facilities built to the highest standards',
              },
              {
                icon: '🏠',
                title: 'Residential Projects',
                desc: 'Custom homes, apartments, and housing developments with attention to detail',
              },
              {
                icon: '🛣️',
                title: 'Infrastructure',
                desc: 'Roads, bridges, and public works that connect and serve communities',
              },
              {
                icon: '🏭',
                title: 'Industrial Construction',
                desc: 'Factories, warehouses, and manufacturing plants designed for efficiency',
              },
              {
                icon: '🔨',
                title: 'Renovation & Remodeling',
                desc: 'Transform existing structures with our expert renovation services',
              },
              {
                icon: '📋',
                title: 'Project Management',
                desc: 'End-to-end project oversight ensuring on-time, on-budget delivery',
              },
            ].map((service, i) => (
              <div
                key={i}
                className="group rounded-xl border border-gray-700 bg-gray-900 p-8 transition-all hover:border-orange-500/50"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-orange-500/10 text-3xl transition-colors group-hover:bg-orange-500/20">
                  {service.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{service.title}</h3>
                <p className="text-gray-400">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="bg-gray-900 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="font-semibold text-orange-500">PORTFOLIO</span>
            <h2 className="mt-3 text-4xl font-bold text-white lg:text-5xl">Featured Projects</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Downtown Tower',
                category: 'Commercial',
                img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
              },
              {
                title: 'Harbor Bridge',
                category: 'Infrastructure',
                img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
              },
              {
                title: 'Green Residences',
                category: 'Residential',
                img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
              },
              {
                title: 'Tech Campus',
                category: 'Commercial',
                img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
              },
              {
                title: 'City Mall',
                category: 'Commercial',
                img: 'https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=600&q=80',
              },
              {
                title: 'Luxury Villas',
                category: 'Residential',
                img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80',
              },
            ].map((project, i) => (
              <div key={i} className="group relative cursor-pointer overflow-hidden rounded-xl">
                <div className="relative h-80">
                  <Image
                    src={project.img}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
                </div>
                <div className="absolute right-0 bottom-0 left-0 p-6">
                  <span className="text-sm font-medium text-orange-500">{project.category}</span>
                  <h3 className="text-xl font-bold text-white">{project.title}</h3>
                </div>
                <div className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80"
            alt="Construction"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-orange-600/90" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white lg:text-5xl">Ready to Build Something Great?</h2>
          <p className="mb-8 text-xl text-white/80">
            Let us turn your construction dreams into reality. Contact us today for a free consultation.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="rounded bg-white px-8 py-4 text-lg font-semibold text-orange-600 transition-all hover:shadow-xl">
              Get Free Quote
            </button>
            <button className="rounded border-2 border-white bg-transparent px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white hover:text-orange-600">
              Call: (555) 987-6543
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                  <HardHat className="h-5 w-5 text-white" />
                </div>
                <span className="text-2xl font-bold">BuildPro</span>
              </div>
              <p className="text-gray-400">Building excellence since 1998. Your trusted construction partner.</p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="transition-colors hover:text-orange-500">
                    Commercial
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-orange-500">
                    Residential
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-orange-500">
                    Industrial
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-orange-500">
                    Infrastructure
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>456 Builder Ave</li>
                <li>Chicago, IL 60601</li>
                <li>(555) 987-6543</li>
                <li>info@buildpro.com</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Follow Us</h4>
              <div className="flex gap-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 transition-colors hover:bg-orange-500"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BuildPro Construction. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

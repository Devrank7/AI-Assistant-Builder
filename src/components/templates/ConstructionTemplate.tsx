'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ConstructionTemplateProps {
  scriptUrl: string;
}

export default function ConstructionTemplate({ scriptUrl }: ConstructionTemplateProps) {
  useEffect(() => {
    if (scriptUrl) {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [scriptUrl]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <span className="text-sm font-medium">Demo Mode</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="bg-gray-900/95 backdrop-blur-md fixed w-full z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl">🏗️</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">BuildPro</span>
                <p className="text-xs text-gray-500">CONSTRUCTION CO.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#projects" className="text-gray-300 hover:text-orange-500 transition-colors">Projects</a>
              <a href="#services" className="text-gray-300 hover:text-orange-500 transition-colors">Services</a>
              <a href="#about" className="text-gray-300 hover:text-orange-500 transition-colors">About</a>
              <a href="#contact" className="text-gray-300 hover:text-orange-500 transition-colors">Contact</a>
              <button className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-2.5 rounded font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all">
                Get Quote
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1920&q=80"
            alt="Construction Site"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/70" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 px-4 py-2 rounded mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-sm font-medium">25+ Years of Excellence</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Building
              <span className="text-orange-500"> Dreams </span>
              Into Reality
            </h1>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              From concept to completion, we deliver exceptional construction services
              with unmatched quality, safety, and innovation. Your vision, our expertise.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <button className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-8 py-4 rounded font-semibold text-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all flex items-center gap-2">
                Start Your Project
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button className="bg-white/10 backdrop-blur text-white px-8 py-4 rounded font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all">
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
        <div className="hidden lg:block absolute right-20 top-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-64 h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Safety First</h3>
              <p className="text-gray-400 text-sm">Zero incidents policy with OSHA certified practices</p>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-600 border-2 border-gray-800" />
                  ))}
                </div>
                <span className="text-sm text-gray-500">1000+ Workers</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-64 h-20 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-4 flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Licensed & Insured</p>
                <p className="text-white/70 text-sm">Fully certified team</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-orange-500 font-semibold">WHAT WE DO</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3">
              Our Construction Services
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🏢', title: 'Commercial Buildings', desc: 'Office complexes, retail spaces, and industrial facilities built to the highest standards' },
              { icon: '🏠', title: 'Residential Projects', desc: 'Custom homes, apartments, and housing developments with attention to detail' },
              { icon: '🛣️', title: 'Infrastructure', desc: 'Roads, bridges, and public works that connect and serve communities' },
              { icon: '🏭', title: 'Industrial Construction', desc: 'Factories, warehouses, and manufacturing plants designed for efficiency' },
              { icon: '🔨', title: 'Renovation & Remodeling', desc: 'Transform existing structures with our expert renovation services' },
              { icon: '📋', title: 'Project Management', desc: 'End-to-end project oversight ensuring on-time, on-budget delivery' },
            ].map((service, i) => (
              <div key={i} className="bg-gray-900 rounded-xl p-8 border border-gray-700 hover:border-orange-500/50 transition-all group">
                <div className="w-16 h-16 bg-orange-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:bg-orange-500/20 transition-colors">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-gray-400">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-orange-500 font-semibold">PORTFOLIO</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3">
              Featured Projects
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Downtown Tower', category: 'Commercial', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80' },
              { title: 'Harbor Bridge', category: 'Infrastructure', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80' },
              { title: 'Green Residences', category: 'Residential', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80' },
              { title: 'Tech Campus', category: 'Commercial', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80' },
              { title: 'City Mall', category: 'Commercial', img: 'https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=600&q=80' },
              { title: 'Luxury Villas', category: 'Residential', img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80' },
            ].map((project, i) => (
              <div key={i} className="group relative overflow-hidden rounded-xl cursor-pointer">
                <div className="relative h-80">
                  <Image
                    src={project.img}
                    alt={project.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="text-orange-500 text-sm font-medium">{project.category}</span>
                  <h3 className="text-xl font-bold text-white">{project.title}</h3>
                </div>
                <div className="absolute top-4 right-4 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80"
            alt="Construction"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-orange-600/90" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Build Something Great?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Let us turn your construction dreams into reality. Contact us today for a free consultation.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-white text-orange-600 px-8 py-4 rounded font-semibold text-lg hover:shadow-xl transition-all">
              Get Free Quote
            </button>
            <button className="bg-transparent text-white px-8 py-4 rounded font-semibold text-lg border-2 border-white hover:bg-white hover:text-orange-600 transition-all">
              Call: (555) 987-6543
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl">🏗️</span>
                </div>
                <span className="text-2xl font-bold">BuildPro</span>
              </div>
              <p className="text-gray-400">Building excellence since 1998. Your trusted construction partner.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-orange-500 transition-colors">Commercial</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Residential</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Industrial</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Infrastructure</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>456 Builder Ave</li>
                <li>Chicago, IL 60601</li>
                <li>(555) 987-6543</li>
                <li>info@buildpro.com</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <a key={social} href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BuildPro Construction. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

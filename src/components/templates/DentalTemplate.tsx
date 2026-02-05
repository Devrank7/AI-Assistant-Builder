'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface DentalTemplateProps {
  scriptUrl: string;
}

export default function DentalTemplate({ scriptUrl }: DentalTemplateProps) {
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
    <div className="min-h-screen bg-white">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <span className="text-sm font-medium">Demo Mode</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md shadow-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🦷</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                SmileCare
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-gray-600 hover:text-cyan-600 transition-colors">Services</a>
              <a href="#about" className="text-gray-600 hover:text-cyan-600 transition-colors">About</a>
              <a href="#team" className="text-gray-600 hover:text-cyan-600 transition-colors">Our Team</a>
              <a href="#contact" className="text-gray-600 hover:text-cyan-600 transition-colors">Contact</a>
              <button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all">
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              Award-Winning Dental Care
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight">
              Your Perfect
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent"> Smile </span>
              Starts Here
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Experience world-class dental care with our team of expert dentists.
              We combine cutting-edge technology with compassionate care to give you the smile you deserve.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/30 transition-all transform hover:-translate-y-1">
                Schedule Visit
              </button>
              <button className="bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg border-2 border-gray-200 hover:border-cyan-500 transition-all flex items-center gap-2">
                <svg className="w-6 h-6 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Watch Video
              </button>
            </div>
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">15K+</p>
                <p className="text-gray-500">Happy Patients</p>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">20+</p>
                <p className="text-gray-500">Years Experience</p>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">50+</p>
                <p className="text-gray-500">Expert Dentists</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="relative w-full h-[500px] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80"
                alt="Dental Care"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-bounce">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">100% Safe</p>
                <p className="text-sm text-gray-500">Sterilized Equipment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-cyan-600 font-semibold">OUR SERVICES</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
              Comprehensive Dental Care
            </h2>
            <p className="text-xl text-gray-600 mt-4 max-w-2xl mx-auto">
              From routine cleanings to advanced procedures, we offer a full range of dental services
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🦷', title: 'General Dentistry', desc: 'Comprehensive exams, cleanings, and preventive care for your whole family' },
              { icon: '✨', title: 'Cosmetic Dentistry', desc: 'Transform your smile with whitening, veneers, and smile makeovers' },
              { icon: '🔧', title: 'Restorative Care', desc: 'Crowns, bridges, implants, and dentures to restore your smile' },
              { icon: '👶', title: 'Pediatric Dentistry', desc: 'Gentle, friendly care designed specifically for children' },
              { icon: '😁', title: 'Orthodontics', desc: 'Invisalign and traditional braces for straighter teeth' },
              { icon: '🚨', title: 'Emergency Care', desc: '24/7 emergency dental services when you need them most' },
            ].map((service, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600">{service.desc}</p>
                <a href="#" className="inline-flex items-center gap-2 text-cyan-600 font-medium mt-4 group-hover:gap-3 transition-all">
                  Learn More
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-cyan-600 font-semibold">OUR TEAM</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
              Meet Our Expert Dentists
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Dr. Sarah Johnson', role: 'Lead Dentist', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80' },
              { name: 'Dr. Michael Chen', role: 'Orthodontist', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80' },
              { name: 'Dr. Emily Davis', role: 'Pediatric Dentist', img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80' },
              { name: 'Dr. James Wilson', role: 'Oral Surgeon', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80' },
            ].map((member, i) => (
              <div key={i} className="group">
                <div className="relative overflow-hidden rounded-2xl mb-4">
                  <Image
                    src={member.img}
                    alt={member.name}
                    width={400}
                    height={400}
                    className="w-full h-80 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-600/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <div className="flex gap-3">
                      {['linkedin', 'twitter', 'email'].map((social) => (
                        <a key={social} href="#" className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white hover:text-cyan-600 transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                <p className="text-cyan-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-cyan-500 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready for a Brighter Smile?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Schedule your appointment today and take the first step towards the smile you have always wanted.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-white text-cyan-600 px-8 py-4 rounded-full font-semibold text-lg hover:shadow-xl transition-all">
              Book Appointment
            </button>
            <button className="bg-transparent text-white px-8 py-4 rounded-full font-semibold text-lg border-2 border-white hover:bg-white hover:text-cyan-600 transition-all">
              Call: (555) 123-4567
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">🦷</span>
                </div>
                <span className="text-2xl font-bold">SmileCare</span>
              </div>
              <p className="text-gray-400">Your trusted partner in dental health since 2004.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Services</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Our Team</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>123 Dental Street</li>
                <li>New York, NY 10001</li>
                <li>(555) 123-4567</li>
                <li>info@smilecare.com</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Hours</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Mon-Fri: 8am - 6pm</li>
                <li>Saturday: 9am - 4pm</li>
                <li>Sunday: Closed</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SmileCare Dental. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

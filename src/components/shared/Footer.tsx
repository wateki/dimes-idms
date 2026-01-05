import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 dark:bg-gray-950 text-gray-400 dark:text-gray-300">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 ">
              <img 
                src="/logo.png" 
                alt="Dimes IDMS Logo" 
                className="w-20 h-20 object-contain"
              />
              
            </div>
            <p className="text-sm">
              DIMES System - Integrated Data Management System for humanitarian organizations
            </p>
          </div>
          <div>
            <h3 className="text-white dark:text-gray-100 font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Features</Link></li>
              <li><a href="#" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Mobile App</a></li>
              <li><Link to="/pricing" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Pricing</Link></li>
              <li><a href="#" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Security</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white dark:text-gray-100 font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/support" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Documentation</Link></li>
              <li><Link to="/support" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Support</Link></li>
              <li><a href="#" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">API</a></li>
              <li><a href="#" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white dark:text-gray-100 font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">About</Link></li>
              <li><Link to="/contact" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Contact</Link></li>
              <li><a href="#" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 dark:border-gray-700 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} DIMES System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import { SignupForm } from '../components/auth/SignupForm';
import { Clock } from 'lucide-react';

export function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Clock className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          15-Minute Audit
        </h2>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <SignupForm />
      </div>
    </div>
  );
}
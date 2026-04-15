import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Info, X } from "lucide-react";

export default function BetaBanner({ language }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('borderPulse_betaBanner_dismissed');
    setIsVisible(!dismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('borderPulse_betaBanner_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800 font-medium">
            {language === 'en' ? 'Beta Version' : 'Versión Beta'}
          </span>
          <span className="text-xs text-blue-600">
            {language === 'en' 
              ? 'This app is in active development' 
              : 'Esta aplicación está en desarrollo activo'
            }
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
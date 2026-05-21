import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '../context/ThemeContext';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords, 
  image,
  url,
  type = 'website'
}) => {
  const { settings } = useTheme();
  
  const fullTitle = title ? `${title} | ${settings.siteName}` : `${settings.siteName} | ${settings.siteDescription || 'Productos al mejor precio'}`;
  const seoImage = image || settings.logoUrl || '';
  const seoUrl = url || window.location.href;
  const seoDescription = description || settings.siteDescription || '';
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {seoDescription && <meta name="description" content={seoDescription} />}
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {seoDescription && <meta property="og:description" content={seoDescription} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seoUrl} />
      {seoImage && <meta property="og:image" content={seoImage} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {seoDescription && <meta name="twitter:description" content={seoDescription} />}
      {seoImage && <meta name="twitter:image" content={seoImage} />}
      
      <link rel="canonical" href={seoUrl} />
    </Helmet>
  );
};

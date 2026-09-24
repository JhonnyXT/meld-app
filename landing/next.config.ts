import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `landing/` vive dentro del repo de la app de Expo, que tiene su propio
  // package-lock.json en la raíz: sin esto Next infiere mal la raíz del
  // proyecto (y avisa en cada build). Esta carpeta es un proyecto npm aparte.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

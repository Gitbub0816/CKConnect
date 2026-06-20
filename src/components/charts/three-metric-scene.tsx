"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeMetricScene({
  metrics,
}: {
  metrics: Array<{ name: string; value: number }>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      host.textContent = "3D visualization is unavailable in this browser.";
      host.classList.add("grid", "place-items-center", "text-sm", "text-white/70");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07111f");
    scene.fog = new THREE.Fog("#07111f", 9, 20);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(7, 6, 10);
    camera.lookAt(0, 1.5, 0);
    scene.add(new THREE.HemisphereLight("#dbeafe", "#111827", 2.5));
    const keyLight = new THREE.DirectionalLight("#ffffff", 3);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const group = new THREE.Group();
    scene.add(group);
    const max = Math.max(...metrics.map((metric) => Math.abs(metric.value)), 1);
    const palette = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"];
    metrics.forEach((metric, index) => {
      const height = 0.6 + (Math.abs(metric.value) / max) * 4.4;
      const geometry = new THREE.BoxGeometry(1.05, height, 1.05);
      const material = new THREE.MeshStandardMaterial({
        color: palette[index % palette.length],
        emissive: palette[index % palette.length],
        emissiveIntensity: 0.13,
        metalness: 0.25,
        roughness: 0.34,
      });
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set((index - (metrics.length - 1) / 2) * 1.8, height / 2, 0);
      group.add(bar);
    });
    const grid = new THREE.GridHelper(18, 18, "#334155", "#162235");
    group.add(grid);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    const render = (time: number) => {
      group.rotation.y = Math.sin(time * 0.00022) * 0.12;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [metrics]);

  return (
    <div className="relative h-[280px] min-h-[280px] w-full overflow-hidden bg-[#07111f]" ref={hostRef}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap gap-x-5 gap-y-1 p-4 text-xs text-white/70">
        {metrics.map((metric) => <span key={metric.name}><strong className="text-white">{metric.name}</strong> {metric.value.toLocaleString()}</span>)}
      </div>
    </div>
  );
}

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

import { TruckScene } from "./TruckScene";

export default function Hero3D() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 7.5, 9.5], fov: 38 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0b0d12"]} />
        <Suspense fallback={null}>
          <TruckScene />
        </Suspense>
      </Canvas>
    </div>
  );
}

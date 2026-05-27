import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShoppingBag, Check, Key, ShieldAlert, Sparkles, Coins, Zap } from 'lucide-react';

const SHOP_ITEMS = {
  chassis: [
    { id: 'chassis_sleek', name: 'Sleek Poly-mesh', desc: 'Disjointed floating aerodynamic glass segments.', price: 0, raw: 'sleek' },
    { id: 'chassis_bulky', name: 'Titan Core-box', desc: 'Interlocking heavy geometric faceted cyber-bricks.', price: 150, raw: 'bulky' },
    { id: 'chassis_spiky', name: 'Crystal Obelisk', desc: 'Sharp high-poly crystalline neon shards.', price: 300, raw: 'spiky' }
  ],
  glow: [
    { id: 'glow_cyan', name: 'Neon Cyan Glow', desc: 'Standard cybernetic data stream luminescence.', price: 0, hex: '#00ffff', raw: 'cyan' },
    { id: 'glow_magenta', name: 'Hyper Magenta', desc: 'Extremely high frequency synthwave energy.', price: 80, hex: '#ff00ff', raw: 'magenta' },
    { id: 'glow_lime', name: 'Toxic Lime Green', desc: 'Glitched radioactive source code emission.', price: 120, hex: '#00ff88', raw: 'lime' },
    { id: 'glow_gold', name: 'Prestige Gold', desc: 'Refined legendary compiler spectrum.', price: 200, hex: '#ffbb00', raw: 'gold' }
  ],
  trail: [
    { id: 'trail_streak', name: 'Light Ribbon', desc: 'A solid glowing horizontal tail streak.', price: 0, raw: 'streak' },
    { id: 'trail_binary', name: 'Digital Matrix', desc: 'Stream of floating binary code elements.', price: 100, raw: 'binary' },
    { id: 'trail_sparks', name: 'Pixel Sparks', desc: 'Exploding particles of classic arcade sparks.', price: 150, raw: 'sparks' }
  ]
};

export default function CustomizerShop({ token, userProfile, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState('chassis');
  const [buying, setBuying] = useState(null);
  const [equipping, setEquipping] = useState(null);
  const [error, setError] = useState(null);

  // Live 3D Preview State (matches hovered or equipped options)
  const [previewOptions, setPreviewOptions] = useState({
    chassis: 'sleek',
    glow: 'cyan',
    trail: 'streak'
  });

  const previewCanvasRef = useRef(null);
  const previewRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    avatarGroup: null,
    avatarParts: [],
    glowColor: 0x00ffff,
    chassis: 'sleek',
    glow: 'cyan'
  });

  // Sync preview configuration when user profile changes
  useEffect(() => {
    if (userProfile) {
      setPreviewOptions({
        chassis: userProfile.equipped_chassis || 'sleek',
        glow: userProfile.equipped_glow || 'cyan',
        trail: userProfile.equipped_trail || 'streak'
      });
    }
  }, [userProfile]);

  // Synchronize 3D preview options
  useEffect(() => {
    previewRef.current.chassis = previewOptions.chassis;
    previewRef.current.glow = previewOptions.glow;
    rebuildPreviewAvatar();
  }, [previewOptions]);

  // COLOR MAPPER
  const getGlowColor = (colorName) => {
    switch (colorName) {
      case 'cyan': return 0x00ffff;
      case 'magenta': return 0xff00ff;
      case 'lime': return 0x00ff88;
      case 'gold': return 0xffbb00;
      default: return 0x00ffff;
    }
  };

  // THREEJS PREVIEW CANVAS INITIALIZATION
  useEffect(() => {
    const width = 240;
    const height = 280;

    const scene = new THREE.Scene();
    
    // Sleek dark purple/black scene background
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.2);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: previewCanvasRef.current, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xff00ff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 1.5);
    dirLight.position.set(2, 5, 2);
    scene.add(dirLight);

    const ptLight = new THREE.PointLight(0xff00ff, 2, 10);
    ptLight.position.set(0, 1.5, 1);
    scene.add(ptLight);

    // Pedagogical Pedestal for the avatar
    const pedestalGeom = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 12);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x110222,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x550055,
      emissiveIntensity: 0.5
    });
    const pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
    pedestal.position.set(0, -0.05, 0);
    scene.add(pedestal);

    // Glowing wireframe grid ring around the pedestal
    const ringGeom = new THREE.RingGeometry(0.85, 0.9, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.08, 0);
    scene.add(ring);

    previewRef.current.scene = scene;
    previewRef.current.camera = camera;
    previewRef.current.renderer = renderer;

    rebuildPreviewAvatar();

    const clock = new THREE.Clock();
    let animId;

    const animatePreview = () => {
      animId = requestAnimationFrame(animatePreview);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Spin the entire avatar group smoothly
      if (previewRef.current.avatarGroup) {
        previewRef.current.avatarGroup.rotation.y += delta * 0.9;
        // Floating effect
        previewRef.current.avatarGroup.position.y = 0.05 + Math.sin(elapsedTime * 2.0) * 0.08;
      }

      // Spin internal disjointed segments individually
      previewRef.current.avatarParts.forEach((part, idx) => {
        part.rotation.y += delta * (0.8 + idx * 0.1);
        part.rotation.x += delta * (0.2 * idx);
      });

      // Slowly pulse pedestal ring glow
      ringMat.opacity = 0.5 + Math.sin(elapsedTime * 3) * 0.4;

      renderer.render(scene, camera);
    };

    animatePreview();

    return () => {
      cancelAnimationFrame(animId);
      scene.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      });
    };
  }, []);

  // COMPOSE 3D AVATAR IN PREVIEW REAL-TIME
  const rebuildPreviewAvatar = () => {
    const ref = previewRef.current;
    if (!ref.scene) return;

    // Clear old avatar
    if (ref.avatarGroup) {
      ref.scene.remove(ref.avatarGroup);
      ref.avatarParts = [];
    }

    const avatarGroup = new THREE.Group();
    const glowColor = getGlowColor(ref.glow);

    // Cyber reflective material
    const mat = new THREE.MeshStandardMaterial({
      color: 0x090214,
      roughness: 0.1,
      metalness: 0.9,
      emissive: glowColor,
      emissiveIntensity: 1.4,
      flatShading: true
    });

    const lightMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.85
    });

    if (ref.chassis === 'sleek') {
      const torso = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), mat);
      torso.position.set(0, 1.0, 0);
      avatarGroup.add(torso);
      ref.avatarParts.push(torso);

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 6), mat);
      head.position.set(0, 1.55, 0);
      head.rotation.x = Math.PI;
      avatarGroup.add(head);
      ref.avatarParts.push(head);

      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), mat);
      lHand.position.set(-0.6, 1.0, 0);
      avatarGroup.add(lHand);
      ref.avatarParts.push(lHand);

      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), mat);
      rHand.position.set(0.6, 1.0, 0);
      avatarGroup.add(rHand);
      ref.avatarParts.push(rHand);

      // Cyber joints
      const jointLine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), lightMat);
      jointLine.position.set(0, 1.3, 0);
      avatarGroup.add(jointLine);

      const handJointL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), lightMat);
      handJointL.rotation.z = Math.PI / 2.5;
      handJointL.position.set(-0.3, 1.0, 0);
      avatarGroup.add(handJointL);

      const handJointR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), lightMat);
      handJointR.rotation.z = -Math.PI / 2.5;
      handJointR.position.set(0.3, 1.0, 0);
      avatarGroup.add(handJointR);

    } else if (ref.chassis === 'bulky') {
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat);
      torso.position.set(0, 0.95, 0);
      avatarGroup.add(torso);
      ref.avatarParts.push(torso);

      const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mat);
      shoulderL.position.set(-0.5, 1.2, 0);
      avatarGroup.add(shoulderL);
      ref.avatarParts.push(shoulderL);

      const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mat);
      shoulderR.position.set(0.5, 1.2, 0);
      avatarGroup.add(shoulderR);
      ref.avatarParts.push(shoulderR);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat);
      head.position.set(0, 1.45, 0);
      avatarGroup.add(head);
      ref.avatarParts.push(head);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), mat);
      legL.position.set(-0.25, 0.4, 0);
      avatarGroup.add(legL);
      ref.avatarParts.push(legL);

      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), mat);
      legR.position.set(0.25, 0.4, 0);
      avatarGroup.add(legR);
      ref.avatarParts.push(legR);

    } else if (ref.chassis === 'spiky') {
      const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), mat);
      torso.position.set(0, 1.0, 0);
      avatarGroup.add(torso);
      ref.avatarParts.push(torso);

      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat);
      head.position.set(0, 1.5, 0);
      avatarGroup.add(head);
      ref.avatarParts.push(head);

      for (let i = 0; i < 4; i++) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 4), mat);
        const angle = (i * Math.PI) / 2;
        shard.position.set(Math.cos(angle) * 0.6, 0.85 + Math.sin(angle) * 0.15, 0);
        shard.rotation.z = angle - Math.PI / 2;
        avatarGroup.add(shard);
        ref.avatarParts.push(shard);
      }

      const spikyLinks = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 8, 24), lightMat);
      spikyLinks.rotation.x = Math.PI / 2;
      spikyLinks.position.set(0, 1.0, 0);
      avatarGroup.add(spikyLinks);
    }

    avatarGroup.position.set(0, 0.05, 0);
    ref.scene.add(avatarGroup);
    ref.avatarGroup = avatarGroup;
  };

  // BUY API HANDLER
  const handleBuyItem = async (item) => {
    setError(null);
    setBuying(item.id);
    try {
      const res = await fetch('/api/user/shop/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: item.id, price: item.price })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Purchase failed');
        return;
      }

      // Successful purchase: update user profile
      const updatedProfile = {
        ...userProfile,
        data_shards: data.data_shards,
        unlocked_items: data.unlocked_items
      };
      onProfileUpdate(updatedProfile);
    } catch (err) {
      setError('Connection failure during checkout.');
    } finally {
      setBuying(null);
    }
  };

  // EQUIP API HANDLER
  const handleEquipItem = async (category, item) => {
    setError(null);
    setEquipping(item.id);
    try {
      const res = await fetch('/api/user/shop/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category, itemId: item.id })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Equipping failed');
        return;
      }

      // Successful Equip: update user profile state
      const columnMap = {
        chassis: 'equipped_chassis',
        glow: 'equipped_glow',
        trail: 'equipped_trail'
      };
      
      const updatedProfile = {
        ...userProfile,
        [columnMap[category]]: item.raw
      };
      
      onProfileUpdate(updatedProfile);
    } catch (err) {
      setError('Connection failure while modifying active components.');
    } finally {
      setEquipping(null);
    }
  };

  // Helper check if item unlocked
  const isUnlocked = (itemId) => {
    if (!userProfile?.unlocked_items) return false;
    return userProfile.unlocked_items.includes(itemId);
  };

  // Helper check if item equipped
  const isEquipped = (category, itemRaw) => {
    if (!userProfile) return false;
    if (category === 'chassis') return userProfile.equipped_chassis === itemRaw;
    if (category === 'glow') return userProfile.equipped_glow === itemRaw;
    if (category === 'trail') return userProfile.equipped_trail === itemRaw;
    return false;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full p-4">
      {/* 3D AVATAR LIVE ROTATING PREVIEW (LEFT COLUMN) */}
      <div className="md:col-span-4 flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        <h3 className="text-sm font-mono tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" /> Linker Preview
        </h3>

        {/* 3D Canvas Box */}
        <div className="relative w-full h-[280px] bg-black/40 border border-purple-500/20 rounded-xl overflow-hidden flex justify-center items-center">
          <canvas ref={previewCanvasRef} className="block w-[240px] h-[280px]" />
          <div className="absolute bottom-2 left-2 right-2 flex justify-between px-2 text-[9px] font-mono text-purple-400/60 uppercase">
            <span>MODEL: ROT_X_90</span>
            <span>SYSTEM STABLE</span>
          </div>
        </div>

        {/* Preview configuration indicators */}
        <div className="w-full space-y-2.5 mt-6 font-mono text-xs">
          <div className="flex justify-between border-b border-white/5 pb-2 text-gray-400">
            <span>PREVIEW CHASSIS:</span>
            <span className="text-cyan-300 font-bold uppercase">{previewOptions.chassis}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2 text-gray-400">
            <span>PREVIEW GLOW:</span>
            <span className="text-pink-300 font-bold uppercase">{previewOptions.glow}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>PREVIEW TRAIL:</span>
            <span className="text-purple-300 font-bold uppercase">{previewOptions.trail}</span>
          </div>
        </div>
      </div>

      {/* SHOPPING CARDS (RIGHT COLUMN) */}
      <div className="md:col-span-8 flex flex-col bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        {/* Header containing wallet indicator */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-light tracking-widest uppercase text-white flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-pink-500" /> System Core Customizer
            </h2>
            <p className="text-gray-400 text-xs mt-1">Upgrade your humanoid segments with custom glow, bodies, and particle trails.</p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/30 rounded-xl shadow-[0_0_12px_rgba(236,72,153,0.2)]">
            <Coins className="w-4 h-4 text-pink-400 animate-pulse" />
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-widest text-pink-400/60 block font-mono">WALLET SHARDS</span>
              <span className="text-base font-mono font-bold text-white">{userProfile?.data_shards ?? 0}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Tab selection */}
        <div className="flex gap-2 mb-6">
          {['chassis', 'glow', 'trail'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase transition-all flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.05)]'
                  : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${activeTab === tab ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} /> {tab}
            </button>
          ))}
        </div>

        {/* Shop Items List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[340px] pr-2 custom-scrollbar">
          {SHOP_ITEMS[activeTab].map((item) => {
            const unlocked = isUnlocked(item.id);
            const equipped = isEquipped(activeTab, item.raw);
            const canAfford = (userProfile?.data_shards ?? 0) >= item.price;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setPreviewOptions(prev => ({ ...prev, [activeTab]: item.raw }))}
                onMouseLeave={() => setPreviewOptions(prev => ({
                  ...prev,
                  [activeTab]: activeTab === 'chassis'
                    ? (userProfile?.equipped_chassis || 'sleek')
                    : activeTab === 'glow'
                    ? (userProfile?.equipped_glow || 'cyan')
                    : (userProfile?.equipped_trail || 'streak')
                }))}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  equipped
                    ? 'bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : unlocked
                    ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    : 'bg-black/20 border-white/5 opacity-80 hover:opacity-100 hover:border-purple-500/20'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className="font-bold text-sm text-gray-100 uppercase tracking-wider">{item.name}</h4>
                    {item.price > 0 && !unlocked && (
                      <div className="flex items-center gap-1 text-xs font-mono text-pink-400">
                        <span>{item.price}</span>
                        <Coins className="w-3 h-3 text-pink-400" />
                      </div>
                    )}
                    {item.price === 0 && !unlocked && (
                      <span className="text-[9px] font-mono uppercase bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">FREE</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-light mb-4 leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-auto">
                  {equipped ? (
                    <div className="w-full flex items-center justify-center gap-1.5 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-lg font-mono text-xs uppercase">
                      <Check className="w-3.5 h-3.5" /> Equipped
                    </div>
                  ) : unlocked ? (
                    <button
                      onClick={() => handleEquipItem(activeTab, item)}
                      disabled={equipping !== null}
                      className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-200 rounded-lg font-mono text-xs uppercase transition-all"
                    >
                      {equipping === item.id ? 'Tuning Core...' : 'Equip System'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyItem(item)}
                      disabled={buying !== null || !canAfford}
                      className={`w-full py-2 rounded-lg font-mono text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                        canAfford
                          ? 'bg-pink-500/20 hover:bg-pink-500/35 border border-pink-500/40 text-pink-200'
                          : 'bg-transparent border border-gray-800 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {buying === item.id ? 'Decryption Transaction...' : canAfford ? 'Decrypt Customizer' : 'Insufficient Shards'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

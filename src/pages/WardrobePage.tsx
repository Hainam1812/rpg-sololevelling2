import React, { useState } from 'react';
import { useGame } from '../store/GameContext.js';
import { CharacterStage } from '../components/game/CharacterStage.js';
import { CharacterSprite } from '../components/game/CharacterSprite.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { RarityBadge } from '../components/ui/Badge.js';
import { COSMETICS, CosmeticDef } from '../data/cosmetics.js';
import { CosmeticSlot, GearSlot } from '../store/types.js';
import gearData from '../data/gear.json' with { type: 'json' };
import { selectUnlockedCosmetics } from '../store/selectors.js';
import { isCosmeticUnlocked } from '../domain/cosmetics.js';
import { saveGearBlob, deleteGearBlob } from '../store/indexedDb.js';
import { CharacterSelectModal } from '../components/game/CharacterSelectModal.js';
import charactersData from '../data/characters.json' with { type: 'json' };
import {
  Shirt,
  Sparkles,
  Layers,
  Upload,
  Check,
  Lock,
  Eye,
  Trash2,
  RotateCcw,
  Plus,
  ArrowRight,
  ChevronRight,
  User,
  Wand2,
} from 'lucide-react';

export const WardrobePage: React.FC = () => {
  const { state, dispatch, now } = useGame();

  const [activeTab, setActiveTab] = useState<'gear' | 'stage' | 'custom'>('gear');
  const [selectedGearSlot, setSelectedGearSlot] = useState<string>('all');
  const [selectedStageSlot, setSelectedStageSlot] = useState<CosmeticSlot | 'all'>('all');
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);

  // Preview override state
  const [previewCosmetic, setPreviewCosmetic] = useState<{ slot: string; id: string } | null>(null);

  // Custom Upload Wizard State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadSlot, setUploadSlot] = useState<any>('head');
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activeCharId = state.profile.characterId || 'hero';
  const unlockedCosmetics = selectUnlockedCosmetics(state, now);
  const unlockedCosmeticIds = new Set(unlockedCosmetics.map(c => c.id));

  const equippedGear = state.equippedGear[activeCharId] || {};
  const equippedCosmetics = state.equippedCosmetics;

  // Custom items list
  const customItems = state.customGearMeta;

  // Filter gear items
  const gearItems = Array.isArray(gearData) ? gearData : [];
  const filteredGear = gearItems.filter(item => {
    if (selectedGearSlot === 'all') return true;
    return item.slot === selectedGearSlot;
  });

  // Filter stage cosmetics
  const filteredStage = COSMETICS.filter(item => {
    if (selectedStageSlot === 'all') return true;
    return item.slot === selectedStageSlot;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File quá lớn! Dung lượng tối đa là 2 MB.');
      return;
    }

    if (!['image/gif', 'image/webp', 'image/png', 'image/apng'].includes(file.type)) {
      setUploadError('Chỉ chấp nhận file ảnh động/tĩnh GIF, WebP, PNG/APNG (từ chối SVG).');
      return;
    }

    setUploadError(null);
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreviewUrl(url);
  };

  const handleSaveCustomGear = async () => {
    if (!uploadFile || !uploadName.trim()) {
      setUploadError('Vui lòng chọn ảnh và đặt tên cho món đồ.');
      return;
    }

    const itemId = `custom-${Date.now()}`;
    // Save blob to IndexedDB
    await saveGearBlob(itemId, uploadFile);

    dispatch({
      type: 'ADD_CUSTOM_GEAR_META',
      payload: {
        item: {
          id: itemId,
          name: uploadName.trim(),
          slot: uploadSlot,
          imageBlobUrl: uploadPreviewUrl || undefined,
          scale,
          offsetX,
          offsetY,
          flipX,
          createdAt: new Date().toISOString(),
        },
      },
    });

    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadName('');
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    setFlipX(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-100 flex items-center gap-2">
            <Shirt className="w-6 h-6 text-cyan-400" />
            <span>Tủ Đồ & Ngoại Trang</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ngoại trang và trang phục thuần thẩm mỹ – Không bán bằng tiền hay XP!
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#161B40] border border-slate-700/60 w-full sm:w-auto">
          {[
            { id: 'gear', label: 'Trang Phục (8 Slot)' },
            { id: 'stage', label: 'Sân Khấu (6 Slot)' },
            { id: 'custom', label: 'Đồ Của Bạn' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setPreviewCosmetic(null);
              }}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
                activeTab === t.id
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Wardrobe Grid (Mobile: sticky preview top, Desktop: side-by-side) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Preview Panel Stage (Sticky on mobile and desktop) */}
        <div className="w-full lg:w-80 shrink-0 sticky top-20 z-30">
          <Card variant="surface" className="p-5 flex flex-col items-center text-center space-y-3 border-cyan-500/30">
            {previewCosmetic && (
              <div className="w-full py-1 px-3 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-lg text-xs font-bold font-pixel">
                ĐANG XEM THỬ (PREVIEW)
              </div>
            )}

            <CharacterStage
              size="lg"
              showNameplate={true}
              previewCosmetics={previewCosmetic ? { [previewCosmetic.slot]: previewCosmetic.id } : undefined}
            />

            <div className="w-full flex items-center justify-between pt-2 border-t border-slate-700/60">
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-pixel uppercase">Nhân vật hiện tại</div>
                <div className="text-xs font-bold text-cyan-300">
                  {state.customCharacters?.find(c => c.id === activeCharId)?.displayName ||
                    charactersData.find((c: any) => c.id === activeCharId)?.displayName ||
                    'Nam Sinh Viên (Quân)'}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={<User className="w-3.5 h-3.5" />}
                onClick={() => setIsCharModalOpen(true)}
              >
                Đổi / Tải GIF
              </Button>
            </div>

            <div className="w-full flex items-center justify-between pt-1">
              {previewCosmetic ? (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setPreviewCosmetic(null)}
                >
                  Hủy xem thử
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activeTab === 'stage') {
                      dispatch({ type: 'UNEQUIP_ALL_COSMETICS' });
                    } else if (activeTab === 'gear') {
                      dispatch({ type: 'UNEQUIP_ALL_GEAR', payload: { characterId: activeCharId } });
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-rose-400"
                >
                  Gỡ hết
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right / Main Content Column */}
        <div className="flex-1 w-full space-y-4">
          {/* TAB 1: Trang phục (Gear) */}
          {activeTab === 'gear' && (
            <div className="space-y-4">
              {/* Slot Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'head', label: 'Đầu' },
                  { id: 'face', label: 'Mặt' },
                  { id: 'body', label: 'Áo' },
                  { id: 'legs', label: 'Quần' },
                  { id: 'feet', label: 'Giày' },
                  { id: 'back', label: 'Lưng' },
                  { id: 'handheld', label: 'Cầm tay' },
                  { id: 'accessory', label: 'Phụ kiện' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedGearSlot(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedGearSlot === s.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#161B40] text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Gear Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredGear.map((item: any) => {
                  const isEquipped = equippedGear[item.slot as GearSlot] === item.id;
                  const isOwned = true; // Starter items are all starter unlocked

                  return (
                    <Card
                      key={item.id}
                      variant={isEquipped ? 'glow' : 'surface'}
                      className="p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-violet-400 uppercase font-pixel">
                            {item.slot}
                          </span>
                          <RarityBadge rarity={item.rarity || 'Common'} />
                        </div>
                        <h4 className="font-bold text-sm text-slate-100 font-heading mt-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                        {isEquipped ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() =>
                              dispatch({
                                type: 'UNEQUIP_GEAR',
                                payload: { characterId: activeCharId, slot: item.slot },
                              })
                            }
                          >
                            Tháo ra
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() =>
                              dispatch({
                                type: 'EQUIP_GEAR',
                                payload: { characterId: activeCharId, slot: item.slot, gearId: item.id },
                              })
                            }
                          >
                            Mặc vào
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Sân khấu (Stage Cosmetics) */}
          {activeTab === 'stage' && (
            <div className="space-y-4">
              {/* Slot Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'backdrop', label: 'Cảnh nền' },
                  { id: 'frame', label: 'Khung viền' },
                  { id: 'aura', label: 'Hào quang' },
                  { id: 'companion', label: 'Linh vật' },
                  { id: 'title', label: 'Danh hiệu' },
                  { id: 'nameplate', label: 'Bảng tên' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageSlot(s.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedStageSlot === s.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#161B40] text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Stage Cosmetics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredStage.map(cos => {
                  const isOwned = unlockedCosmeticIds.has(cos.id);
                  const isEquipped = equippedCosmetics[cos.slot] === cos.id;

                  return (
                    <Card
                      key={cos.id}
                      variant={isEquipped ? 'glow' : 'surface'}
                      className={`p-4 flex flex-col justify-between space-y-3 ${
                        !isOwned ? 'opacity-70 bg-slate-900/40' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase font-pixel">
                            {cos.slot}
                          </span>
                          <RarityBadge rarity={cos.rarity} />
                        </div>
                        <h4 className="font-bold text-sm text-slate-100 font-heading mt-1">
                          {cos.name}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {cos.description}
                        </p>
                      </div>

                      {/* Unlock condition notice if locked */}
                      {!isOwned && (
                        <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300 flex items-start gap-1.5">
                          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            Khóa: {cos.unlock.type === 'level' ? `Đạt Level ${cos.unlock.level}` : cos.unlock.type === 'streak' ? `Đạt Streak ${cos.unlock.days} ngày` : 'Thử thách trong game'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                        {isOwned ? (
                          isEquipped ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              fullWidth
                              onClick={() =>
                                dispatch({ type: 'UNEQUIP_COSMETIC', payload: { slot: cos.slot } })
                              }
                            >
                              Tháo ra
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              fullWidth
                              onClick={() => {
                                dispatch({
                                  type: 'EQUIP_COSMETIC',
                                  payload: { slot: cos.slot, cosmeticId: cos.id },
                                });
                                setPreviewCosmetic(null);
                              }}
                            >
                              Trang bị
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setPreviewCosmetic({ slot: cos.slot, id: cos.id })}
                          >
                            Xem thử
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Đồ của bạn (Custom User Gear & 2D Pixel Presets) */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              {/* Presets Gallery */}
              <div className="p-4 rounded-2xl bg-[#161B40] border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Phụ Kiện 2D Pixel Sẵn Có (Animated GIF)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bấm vào phụ kiện để trang bị nhanh lên nhân vật sinh viên của bạn!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
                  {[
                    { id: 'preset-coffee', name: 'Ly Cà Phê Cày Deadline', slot: 'handheld', src: 'assets/gear/coffee_cup.gif', scale: 1.2, offsetX: -16, offsetY: 12 },
                    { id: 'preset-grad', name: 'Mũ Cử Nhân Pixel', slot: 'head', src: 'assets/gear/grad_cap.gif', scale: 1.2, offsetX: 0, offsetY: -34 },
                    { id: 'preset-shades', name: 'Kính Râm Pixel Ngầu', slot: 'face', src: 'assets/gear/pixel_shades.gif', scale: 1.0, offsetX: 0, offsetY: -12 },
                    { id: 'preset-cat', name: 'Mèo Đậu Trên Đầu', slot: 'head', src: 'assets/gear/cat_on_head.gif', scale: 1.1, offsetX: 0, offsetY: -34 },
                    { id: 'preset-headset', name: 'Tai Nghe Gaming Sinh Viên', slot: 'head', src: 'assets/gear/gaming_headset.gif', scale: 1.2, offsetX: 0, offsetY: -20 },
                  ].map(preset => {
                    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
                    const fullSrc = `${baseUrl}/${preset.src}`;
                    const isAlreadyEquipped = customItems.some(c => c.id === preset.id);

                    return (
                      <div
                        key={preset.id}
                        className="p-2.5 rounded-xl bg-[#0F132E] border border-slate-700 hover:border-cyan-400/60 transition-all flex flex-col items-center text-center space-y-2 select-none"
                      >
                        <div className="w-14 h-14 flex items-center justify-center bg-[#161B40] rounded-lg p-1 border border-slate-800">
                          <img
                            src={fullSrc}
                            alt={preset.name}
                            className="max-h-full max-w-full object-contain pixelated"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-200 line-clamp-1 leading-tight">
                          {preset.name}
                        </span>
                        <Button
                          variant={isAlreadyEquipped ? 'secondary' : 'cyan'}
                          size="sm"
                          fullWidth
                          className="text-[10px] py-1"
                          onClick={() => {
                            if (isAlreadyEquipped) {
                              dispatch({ type: 'REMOVE_CUSTOM_GEAR_META', payload: { id: preset.id } });
                            } else {
                              dispatch({
                                type: 'ADD_CUSTOM_GEAR_META',
                                payload: {
                                  item: {
                                    id: preset.id,
                                    name: preset.name,
                                    slot: preset.slot as any,
                                    imageBlobUrl: fullSrc,
                                    scale: preset.scale,
                                    offsetX: preset.offsetX,
                                    offsetY: preset.offsetY,
                                    flipX: false,
                                    createdAt: new Date().toISOString(),
                                  },
                                },
                              });
                            }
                          }}
                        >
                          {isAlreadyEquipped ? 'Đang đeo' : '+ Đeo ngay'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Uploaded Gear */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Phụ Kiện Tự Tải Lên (GIF / PNG)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tải lên file ảnh động/tĩnh 2D Pixel của riêng bạn, căn chỉnh vị trí & kích thước trực quan.
                  </p>
                </div>
                <Button
                  variant="cyan"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Tải lên phụ kiện
                </Button>
              </div>

              {customItems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#161B40]/60 border border-dashed border-slate-700 space-y-3">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-200">
                    Chưa có món đồ cá nhân nào
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Chọn nhanh các phụ kiện pixel sẵn có ở trên hoặc bấm "Tải lên phụ kiện" để thêm GIF/PNG riêng của bạn!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {customItems.map(item => (
                    <Card key={item.id} variant="surface" className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase font-pixel">
                          {item.slot}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Xóa món đồ "${item.name}"?`)) {
                              await deleteGearBlob(item.id);
                              dispatch({ type: 'REMOVE_CUSTOM_GEAR_META', payload: { id: item.id } });
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="h-20 bg-[#0F132E] rounded-xl flex items-center justify-center p-2 border border-slate-800">
                        {item.imageBlobUrl ? (
                          <img src={item.imageBlobUrl} alt={item.name} className="max-h-full object-contain pixelated" />
                        ) : (
                          <span className="text-xs text-slate-500 font-pixel">Custom Item</span>
                        )}
                      </div>

                      <div className="font-bold text-sm text-slate-100">{item.name}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Gear Upload Wizard Modal */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#161B40] border border-cyan-500/50 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-heading text-slate-100">
              Thêm Đồ Trang Bị Của Bạn (Tải Lên)
            </h3>

            {/* Step 1: File selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">1. Chọn file ảnh (GIF, WebP, PNG &le; 2MB):</label>
              <input
                type="file"
                accept="image/png,image/gif,image/webp,image/apng"
                onChange={handleFileSelect}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
              />
            </div>

            {/* Step 2: Name & Slot */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">2. Tên món đồ (1-30 ký tự):</label>
              <input
                type="text"
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                placeholder="VD: Mũ Phù Thủy Tím..."
                maxLength={30}
                className="w-full px-3 py-2 rounded-xl bg-[#0F132E] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">3. Vị trí Slot:</label>
              <select
                value={uploadSlot}
                onChange={e => setUploadSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0F132E] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="head">head (Mũ, nón, băng đô)</option>
                <option value="face">face (Kính, mặt nạ)</option>
                <option value="body">body (Áo, hoodie, giáp)</option>
                <option value="legs">legs (Quần, váy)</option>
                <option value="feet">feet (Giày, ủng)</option>
                <option value="back">back (Balo, cánh)</option>
                <option value="handheld">handheld (Vũ khí, sách, laptop)</option>
                <option value="accessory">accessory (Đồng hồ, huy hiệu)</option>
              </select>
            </div>

            {/* Step 3: Alignment preview controls */}
            {uploadPreviewUrl && (
              <div className="space-y-3 pt-2 border-t border-slate-700">
                <div className="text-xs font-bold text-slate-300">
                  4. Căn chỉnh vị trí trên nhân vật:
                </div>

                <div className="h-40 bg-[#0F132E] rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-800">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <CharacterSprite characterId={activeCharId} scale={0.7} />
                    <img
                      src={uploadPreviewUrl}
                      alt="Xem thử căn chỉnh"
                      className="absolute pointer-events-none"
                      style={{
                        transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) ${
                          flipX ? 'scaleX(-1)' : ''
                        }`,
                      }}
                    />
                  </div>
                </div>

                {/* Adjust Sliders */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400">X: {offsetX}px</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={offsetX}
                      onChange={e => setOffsetX(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">Y: {offsetY}px</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={offsetY}
                      onChange={e => setOffsetY(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">Scale: {scale.toFixed(1)}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={scale}
                      onChange={e => setScale(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="flex items-center pt-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flipX}
                        onChange={e => setFlipX(e.target.checked)}
                        className="rounded accent-cyan-400"
                      />
                      <span>Lật ngang</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {uploadError && <p className="text-xs text-rose-400 font-medium">{uploadError}</p>}

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                }}
              >
                Hủy
              </Button>
              <Button variant="cyan" fullWidth onClick={handleSaveCustomGear}>
                Lưu Vào Tủ Đồ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Character Select & Upload Modal */}
      <CharacterSelectModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        title="Đổi Nhân Vật hoặc Tải Lên GIF Riêng"
        subtitle="Chọn nhân vật sinh viên 2D Pixel hoặc tải file ảnh GIF 2D Pixel của bạn để làm ảnh đại diện phiêu lưu!"
      />
    </div>
  );
};

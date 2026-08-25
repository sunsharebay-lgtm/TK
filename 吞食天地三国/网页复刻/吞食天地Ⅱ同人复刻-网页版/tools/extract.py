#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TnDT 资源提取管线（可复现构建工具）

将 TNW 引擎加密数据包(gmdata/tnwdata)还原为网页运行时可直接使用的资源树。

加密方案（逆向分析结论）：
  1) 每个文件逐字节 XOR 0x2F
  2) 整体循环旋转：容器 = 原文件[末尾K字节] + 原文件[0..n-K)
     还原时通过魔数(PNG/OggS)或 JSON 解析校验定位旋转点 K
  3) data/*.json 的文件名为 md5(小写原路径)，如 md5("data/map001.json")
  4) version.xml 中的 MD5 是"加密后原始字节"的校验值，仅用于分发完整性

输出：
  assets/data/*.json          解码后的数据库与地图
  assets/img/<类目>/<名>.png  按数据引用关系命名
  assets/audio/<类目>/<名>.ogg
  assets/fonts/*.woff         界面字体
  store/<md5>                 原始加密文件副本（回退解析用）
"""
import os, sys, re, json, hashlib, shutil, argparse

XOR_KEY = 0x2F
DEFAULT_SRC = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "..", "吞食天地", "【电脑端】吞食天地Ⅱ同人复刻（正式版）", "gmdata", "tnwdata")

DATA_NAMES = ["actors","classes","skills","items","weapons","armors","enemies",
              "troops","states","animations","tilesets","commonevents","system","mapinfos"]
IMG_DIRS = ["img/characters","img/faces","img/enemies","img/sv_actors","img/sv_enemies",
            "img/tilesets","img/animations","img/battlebacks1","img/battlebacks2",
            "img/parallaxes","img/pictures","img/system","img/titles1","img/titles2"]
AUD_DIRS = ["audio/bgm","audio/bgs","audio/me","audio/se"]
AUD_EXTS = [".ogg",".m4a",".mp3"]

def xor(d):
    return bytes(c ^ XOR_KEY for c in d)

def md5s(s): return hashlib.md5(s.encode()).hexdigest()

def try_json_rotation(dec, max_probe=600, max_parse=12):
    """尝试把旋转的 JSON 文本转回来；返回还原后的 bytes 或 None"""
    cands = []
    n = 0
    for k in range(min(len(dec), max_probe)):
        if dec[k:k+1] in (b'{', b'['):
            rot = dec[k:] + dec[:k]
            try:
                json.loads(rot.decode('utf-8'))
                return rot
            except Exception:
                pass
            cands.append(rot)
            n += 1
            if n >= max_parse:
                break
    # 头部就是合法 JSON 开头的情况
    try:
        json.loads(dec.decode('utf-8'))
        return dec
    except Exception:
        pass
    return None

def fix_png(dec):
    i = dec.find(b'\x89PNG\r\n\x1a\n')
    return (dec[i:] + dec[:i]) if i > 0 else None

def fix_ogg(dec):
    i = dec.find(b'OggS')
    return (dec[i:] + dec[:i]) if i > 0 else None

class Extractor:
    def __init__(self, src, out_root):
        self.src = src
        self.data_dir = os.path.join(src, "data")
        self.out = out_root
        self.assets = os.path.join(out_root, "assets")
        self.store = os.path.join(self.assets, "store")
        self.name_of = {}      # hash -> 目标相对路径
        self.stats = {}

    def run(self):
        for d in ("data", "fonts"):
            os.makedirs(os.path.join(self.assets, d), exist_ok=True)
        os.makedirs(self.store, exist_ok=True)
        hashes = set(os.listdir(self.data_dir))
        # 1) data json 名字表
        known = {}
        for n in DATA_NAMES:
            known[md5s(f"data/{n}.json")] = f"{n}.json"
        for i in range(1, 1000):
            known[md5s(f"data/map{i:03d}.json")] = f"map{i:03d}.json"
        # 2) 解码全部文件
        decoded = {}
        kinds = {"json":0,"png":0,"ogg":0,"raw":0}
        for h in sorted(hashes):
            raw = open(os.path.join(self.data_dir, h), 'rb').read()
            shutil.copy2(os.path.join(self.data_dir, h), os.path.join(self.store, h))
            dec = xor(raw)
            rel = None
            if h in known and try_json_rotation(dec) is not None:
                rel = ("data", known[h]); kinds["json"] += 1
                decoded[h] = try_json_rotation(dec)
            elif fix_png(dec) is not None:
                rel = ("png", None); kinds["png"] += 1
                decoded[h] = fix_png(dec)
            elif fix_ogg(dec) is not None:
                rel = ("ogg", None); kinds["ogg"] += 1
                decoded[h] = fix_ogg(dec)
            else:
                rj = try_json_rotation(dec)
                if rj is not None:
                    rel = ("data", f"_extra_{h[:10]}.json"); kinds["json"] += 1
                    decoded[h] = rj
                else:
                    rel = ("bin", h); kinds["raw"] += 1
                    decoded[h] = dec
            self.name_of[h] = rel
        # 写出 data
        for h, blob in decoded.items():
            rel = self.name_of[h]
            if rel[0] == "data":
                with open(os.path.join(self.assets, "data", rel[1]), "wb") as f:
                    f.write(blob)
        # 3) 从数据中收割资源引用，给 png/ogg 命名
        strings = set()
        def walk(o):
            if isinstance(o, str):
                if 0 < len(o) < 100 and not o.startswith("\\"):
                    strings.add(o.strip())
            elif isinstance(o, list):
                for x in o: walk(x)
            elif isinstance(o, dict):
                for v in o.values(): walk(v)
        data_jsons = {h: b for h, b in decoded.items() if self.name_of[h][0] == "data"}
        for b in data_jsons.values():
            try: walk(json.loads(b.decode('utf-8')))
            except Exception: pass
        png_map, aud_map = {}, {}
        for s in sorted(strings):
            base = s
            if "/" in s or "\\" in s: continue
            for d in IMG_DIRS:
                for cand in (f"{d}/{base}.png", f"{d}/${base}.png"):
                    hh = md5s(cand.lower())
                    if hh in decoded and self.name_of[hh][0] == "png":
                        png_map.setdefault(hh, cand)
                hh = md5s(f"{d}/{base.lstrip('$!')}.png".lower())
                if hh in decoded and self.name_of[hh][0] == "png":
                    png_map.setdefault(hh, f"{d}/{base.lstrip('$!')}.png")
            for d in AUD_DIRS:
                for e in AUD_EXTS:
                    hh = md5s(f"{d}/{base}{e}".lower())
                    if hh in decoded and self.name_of[hh][0] == "ogg":
                        aud_map.setdefault(hh, f"{d}/{base}{e}")
        # 4) 物理写出 img/audio 树
        counts = {"img":0, "audio":0, "img_un":0, "aud_un":0}
        for h, blob in decoded.items():
            kind = self.name_of[h][0]
            if kind == "png":
                rel = png_map.get(h)
                sub = os.path.join(self.assets, rel) if rel else \
                      os.path.join(self.assets, "img/_unmatched", h + ".png")
                os.makedirs(os.path.dirname(sub), exist_ok=True)
                open(sub, "wb").write(blob)
                counts["img" if rel else "img_un"] += 1
            elif kind == "ogg":
                rel = aud_map.get(h)
                sub = os.path.join(self.assets, rel) if rel else \
                      os.path.join(self.assets, "audio/_unmatched", h + ".ogg")
                os.makedirs(os.path.dirname(sub), exist_ok=True)
                open(sub, "wb").write(blob)
                counts["audio" if rel else "aud_un"] += 1
        # 5) 字体
        fsrc = os.path.join(self.src, "fonts")
        if os.path.isdir(fsrc):
            for f in os.listdir(fsrc):
                shutil.copy2(os.path.join(fsrc, f), os.path.join(self.assets, "fonts", f))
        self.stats = dict(kinds=kinds, **counts,
                          named_png=len(png_map), named_aud=len(aud_map))
        return self.stats

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.environ.get("TND_SRC", DEFAULT_SRC))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    a = ap.parse_args()
    ex = Extractor(a.src, a.out)
    st = ex.run()
    print("提取完成:", json.dumps(st, ensure_ascii=False, indent=2))

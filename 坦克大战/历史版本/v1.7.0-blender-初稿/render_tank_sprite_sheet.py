"""Render the Steel Frontline low-poly tank sprite sheet.

Run from the Tank Battle folder:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python 美术/blender/render_tank_sprite_sheet.py

The scene is intentionally an offline art source. The browser only downloads
the exported PNG, so the game remains a lightweight click-to-play web game.
"""

import bpy
import math
import os


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUTPUT = os.path.join(ROOT, "assets", "blender", "tank-sprites-v1.png")
BLEND = os.path.join(ROOT, "美术", "blender", "tank-sprites-v1.blend")

TILE = 96
COLS = 8  # two tread frames × four directions
ROWS = 9
GAP = 10.0

SKINS = [
    ("p1", "#f2c14e", "player"),
    ("p2", "#6fd47a", "player"),
    ("basic", "#9aa6b8", "basic"),
    ("fast", "#5ec8e8", "fast"),
    ("power", "#e8763f", "power"),
    ("armor4", "#e6eaf2", "armor"),
    ("armor3", "#a78bfa", "armor"),
    ("armor2", "#ffd45e", "armor"),
    ("armor1", "#5ce08a", "armor"),
]


def hex_color(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)


def material(name, color, metallic=0.0, roughness=0.48, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = next((node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        raise RuntimeError("Blender did not create a Principled BSDF material node")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    mat.surface_render_method = "DITHERED"
    return mat


MATS = {}


def get_mat(name, color, metallic=0.0, roughness=0.48, alpha=1.0):
    key = (name, color, metallic, roughness, alpha)
    if key not in MATS:
        MATS[key] = material(name, color, metallic, roughness, alpha)
    return MATS[key]


def add_box(name, location, dims, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft armored edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return obj


def add_cylinder(name, location, radius, depth, mat, vertices=12, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if rotation:
        obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Machined edge", "BEVEL")
    bevel.width = min(radius * 0.16, 0.12)
    bevel.segments = 2
    return obj


def add_disk_shadow(location):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=2.75, depth=0.02, location=(location[0], location[1] - 0.1, 0.02))
    shadow = bpy.context.object
    shadow.name = "Soft contact shadow"
    shadow.scale.x = 0.88
    shadow.scale.y = 1.18
    shadow.data.materials.append(get_mat("shadow", (0.008, 0.012, 0.02, 0.22), 0, 1.0, 0.22))
    return shadow


def add_tank(location, base_hex, style, direction, tread_frame):
    """Build one readable, top-down low-poly tank instance facing +Y before rotation."""
    root = bpy.data.objects.new("Tank root", None)
    bpy.context.collection.objects.link(root)
    root.location = location
    root.rotation_euler[2] = -direction * math.pi / 2

    base = hex_color(base_hex)
    dark = tuple(channel * 0.42 for channel in base[:3]) + (1,)
    light = tuple(min(1.0, channel * 1.36 + 0.04) for channel in base[:3]) + (1,)
    trim = tuple(channel * 0.24 for channel in base[:3]) + (1,)
    track = (0.055, 0.072, 0.105, 1)
    track_hi = (0.19, 0.24, 0.32, 1)

    body_mat = get_mat("body " + base_hex, base, 0.58, 0.31)
    dark_mat = get_mat("armor shade " + base_hex, dark, 0.68, 0.37)
    light_mat = get_mat("armor highlight " + base_hex, light, 0.50, 0.25)
    trim_mat = get_mat("trim " + base_hex, trim, 0.75, 0.42)
    track_mat = get_mat("track", track, 0.8, 0.5)
    track_hi_mat = get_mat("track tread", track_hi, 0.65, 0.42)

    def part(obj):
        obj.parent = root
        return obj

    part(add_disk_shadow(location))

    # Tracks, road wheels, and alternating tread bars make the second frame move.
    for side in (-1, 1):
        part(add_box("Track", (location[0] + side * 1.55, location[1], 0.45), (0.94, 5.15, 0.62), track_mat, 0.16))
        for y in (-1.75, -0.62, 0.62, 1.75):
            part(add_cylinder("Road wheel", (location[0] + side * 1.55, location[1] + y, 0.79), 0.28, 0.14, trim_mat, 12))
        for step in range(6):
            y = -2.08 + ((step * 0.82 + tread_frame * 0.41) % 4.7)
            part(add_box("Tread plate", (location[0] + side * 1.55, location[1] + y, 0.79), (0.83, 0.15, 0.09), track_hi_mat, 0.03))

    # Chassis with a tapered-looking top armor plate and distinct front glacis.
    part(add_box("Lower hull", (location[0], location[1] - 0.05, 0.74), (2.55, 4.45, 0.72), dark_mat, 0.24))
    part(add_box("Upper hull", (location[0], location[1] + 0.1, 1.22), (2.18, 3.26, 0.48), body_mat, 0.18))
    part(add_box("Front glacis", (location[0], location[1] + 1.54, 1.48), (2.0, 0.62, 0.24), light_mat, 0.08))
    part(add_box("Rear engine deck", (location[0], location[1] - 1.56, 1.47), (1.92, 0.82, 0.20), trim_mat, 0.05))

    # Turret and barrel.
    turret_radius = 1.13 if style != "fast" else 0.98
    part(add_cylinder("Turret", (location[0], location[1] + 0.15, 1.68), turret_radius, 0.58, body_mat, 16))
    part(add_cylinder("Commander hatch", (location[0] - 0.25, location[1] + 0.06, 2.03), 0.31, 0.16, trim_mat, 12))
    barrel_length = 2.45 if style != "power" else 3.15
    part(add_cylinder("Cannon", (location[0], location[1] + 1.4 + barrel_length / 2, 1.79), 0.19 if style != "power" else 0.25, barrel_length, trim_mat, 12, (math.pi / 2, 0, 0)))
    part(add_cylinder("Muzzle brake", (location[0], location[1] + 1.4 + barrel_length, 1.79), 0.29 if style == "power" else 0.23, 0.26, dark_mat, 12, (math.pi / 2, 0, 0)))

    # Type silhouettes retain the gameplay readability of the original skins.
    if style == "fast":
        for offset in (-0.46, 0.0, 0.46):
            part(add_box("Speed stripe", (location[0] + offset, location[1] - 0.85, 1.55), (0.22, 1.05, 0.08), light_mat, 0.02))
    elif style == "power":
        part(add_box("Gun counterweight", (location[0], location[1] + 1.66, 1.82), (0.74, 0.44, 0.30), dark_mat, 0.05))
        part(add_box("Reinforced mantlet", (location[0], location[1] + 0.92, 1.83), (1.2, 0.5, 0.28), light_mat, 0.07))
    elif style == "armor":
        for side in (-1, 1):
            part(add_box("Side armor", (location[0] + side * 1.42, location[1], 1.2), (0.36, 2.65, 0.42), light_mat, 0.08))
    elif style == "player":
        part(add_box("Player marking", (location[0], location[1] - 0.58, 1.55), (0.84, 0.40, 0.10), light_mat, 0.03))

    return root


def prototype_collection(key, color, style, tread_frame):
    """Create a reusable tank prototype, then place inexpensive collection instances."""
    root = add_tank((0, 0, 0), color, style, 0, tread_frame)
    collection = bpy.data.collections.new(key)
    bpy.context.scene.collection.children.link(collection)
    members = [root] + list(root.children_recursive)
    for obj in members:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        collection.objects.link(obj)
    return collection


def look_at(obj, target):
    direction = mathutils.Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def main():
    # Imported lazily so a Blender-only dependency remains obvious.
    global mathutils
    import mathutils

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in datablocks:
            if block.users == 0:
                datablocks.remove(block)

    scene = bpy.context.scene
    # Workbench is intentional here: this is a top-down sprite bake, not a
    # photorealistic render. It preserves material colors and cavity shading
    # while keeping asset rebuilds fast enough for routine iteration.
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = TILE * COLS
    scene.render.resolution_y = TILE * ROWS
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.filepath = OUTPUT
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.curvature_ridge_factor = 1.6
    scene.display.shading.curvature_valley_factor = 1.2
    scene.render.use_file_extension = True
    scene.world.color = (0.015, 0.02, 0.035)

    # A straight-down orthographic camera preserves collision readability.
    bpy.ops.object.camera_add(location=(35, -40, 70))
    cam = bpy.context.object
    cam.name = "Orthographic sprite camera"
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = ROWS * GAP
    cam.rotation_euler = (0, 0, 0)
    look_at(cam, (35, -40, 0))
    scene.camera = cam

    prototypes = {}
    for key, color, style in SKINS:
        for tread in range(2):
            prototypes[(key, tread)] = prototype_collection(f"{key}-tread-{tread}", color, style, tread)

    for row, (key, _color, _style) in enumerate(SKINS):
        for tread in range(2):
            for direction in range(4):
                col = tread * 4 + direction
                instance = bpy.data.objects.new(f"{key} frame {tread} direction {direction}", None)
                instance.instance_type = "COLLECTION"
                instance.instance_collection = prototypes[(key, tread)]
                instance.location = (col * GAP + GAP / 2, -row * GAP - GAP / 2, 0)
                instance.rotation_euler[2] = -direction * math.pi / 2
                bpy.context.scene.collection.objects.link(instance)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    bpy.ops.render.render(write_still=True)
    print("Rendered", OUTPUT)


if __name__ == "__main__":
    main()

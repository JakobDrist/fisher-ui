// @ts-nocheck -- upstream Originkit source uses Framer-specific transition types.
import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}
import {
    animate,
    motion,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
} from "framer-motion"

type CarouselTransition = Record<string, unknown>

/**
 * BoxCarousel — a 3D cube/box carousel. Four cube faces (front, top/bottom/
 * left/right) each show one carousel item; rotating the cube reveals the
 * next or previous item. Supports image and video items, drag/swipe along
 * the rotation axis, keyboard nav (arrow keys), autoplay, and any of four
 * directions (left = horizontal forward, right = horizontal backward, top =
 * vertical forward, bottom = vertical backward).
 *
 * Adaptations from the source (`fancycomponents.dev/docs/components/carousel/
 * box-carousel`) for Framer:
 *
 * - No `forwardRef` / imperative API. Navigation is driven by autoplay,
 *   keyboard (arrow keys), and drag. Drag is automatic: enabled whenever
 *   autoplay is off, disabled while autoplaying. `onIndexChange` covers the
 *   read direction for programmatic consumers.
 * - Items are a flat array of `{ type, src, srcUrl, alt, poster }` configured
 *   via Property Controls. `srcUrl` is a string override that wins over the
 *   Framer image picker (`src`) when provided — matches the InfiniteGallery
 *   pattern in this folder.
 * - Auto-pads with placeholders if fewer than 4 items are supplied, so the
 *   cube always has all four faces populated.
 * - The rotation transition is the `ease` Transition control (`duration` =
 *   move speed, `delay` = delay before each move; drag-release commits ignore
 *   the delay). Snap-back uses a fixed spring; `transition` / `snapTransition`
 *   in the Props type still allow a full programmatic override.
 * - Every face renders at a fixed `imageWidth` × `imageHeight` (px); the cube
 *   is centered inside the component's frame.
 * - Only the FRONT face is rendered as a flat image on the canvas / export /
 *   thumbnail (drag/keyboard/autoplay skipped) — it just shows the first
 *   default or uploaded image. The live animated cube runs only in Preview.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 350
 * @framerIntrinsicHeight 250
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CarouselItemType = "image" | "video"

export type CarouselItem = {
    /** Unique identifier — auto-derived from index if not supplied. */
    id?: string | number
    type: CarouselItemType
    /** Framer image-picker value (object with `src`/`srcSet`) or a plain URL. */
    src?: any
    /** Direct URL override. Wins over `src` when non-empty. */
    srcUrl?: string
    alt?: string
    /** Video poster image (image picker or URL). */
    poster?: any
}

export type Direction = "left" | "right" | "top" | "bottom"

type Props = {
    /** Carousel items. At least 4 are needed for a proper 4-face cube; missing
     *  faces are padded with cycled placeholders. */
    items: CarouselItem[]
    /** Rotation direction. */
    direction: Direction
    /** Each face renders at exactly imageWidth × imageHeight (px). */
    imageWidth: number
    imageHeight: number
    /** Interaction: "autoplay" rotates on its own (paced by `ease`), "drag"
     *  lets the user swipe. */
    animation: "autoplay" | "drag"
    /** Rotation transition (framer Transition control). `duration` = move
     *  speed, `delay` = delay before each move starts. */
    ease?: CarouselTransition
    /** Drag sensitivity (1–10). Only used when `animation` is "drag". */
    dragSensitivity: number

    // ---- Non-serializable / programmatic-only ------------------------------
    /** Emitted when the current item index changes. */
    onIndexChange?: (index: number) => void
    /** Full transition override (wins over `ease`). */
    transition?: CarouselTransition
    /** Full snap transition override. */
    snapTransition?: CarouselTransition

    /** Framer-injected style. */
    style?: React.CSSProperties
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Source's ease curve. Used when `transition` isn't overridden.
const DEFAULT_EASE: [number, number, number, number] = [
    0.953, 0.001, 0.019, 0.995,
]

// Demo placeholder items so the component looks alive on first drop.
const PLACEHOLDER_URLS = [
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/612d1402-0ad9-4135-3bbc-a30a6a252b00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6d2ad64a-102d-4eab-0efe-31479e34b500/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/be854dd1-37aa-4fc7-f569-fdb948109300/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/51984031-9176-484b-f5e0-4af9a8e9ed00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/34ce1842-4b7a-4d52-0302-38582c341700/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/88369c6d-00cc-4ac9-74ca-0f0965e06300/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/aeaa0756-9647-4f6c-d900-204bd25e4a00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/316d1761-fd79-4ca9-b8d4-f2bb20521a00/w=800",
]

const DEFAULT_ITEMS: CarouselItem[] = PLACEHOLDER_URLS.map((url, i) => ({
    id: i,
    type: "image" as const,
    srcUrl: url,
    alt: `Box carousel item ${i + 1}`,
}))

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Resolve a "Framer image picker OR URL string OR raw object" into a usable
// `src` URL string. Framer's ResponsiveImage shape is `{ src, srcSet, alt }`;
// plain string URLs and unknowns are passed through as-is.
function resolveImageSrc(input: any): string {
    if (!input) return ""
    if (typeof input === "string") return input
    if (typeof input === "object" && input.src) return input.src
    return ""
}

function resolveImageSrcSet(input: any): string | undefined {
    if (input && typeof input === "object" && input.srcSet) return input.srcSet
    return undefined
}

// Pad an items array out to at least 4 entries by cycling whatever's there.
// Returns the default placeholder set if `items` is empty / nullish.
function padItems(items: CarouselItem[] | undefined): CarouselItem[] {
    if (!items || items.length === 0) return DEFAULT_ITEMS
    if (items.length >= 4) return items
    const padded: CarouselItem[] = []
    for (let i = 0; i < 4; i++) padded.push(items[i % items.length])
    return padded
}

// Modular index — handles negatives correctly so `prev` from index 0 wraps
// to the last item.
function modIdx(i: number, n: number): number {
    if (n <= 0) return 0
    return ((i % n) + n) % n
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function BoxCarousel(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props } as Props
    const {
        items: rawItems,
        direction,
        ease,
        animation,
        dragSensitivity,
        imageWidth,
        imageHeight,
        onIndexChange,
        transition: transitionOverride,
        snapTransition: snapTransitionOverride,
        style,
    } = props

    // Freeze ONLY on true static renders (export / thumbnail). On the Framer
    // canvas and in Preview we let the cube animate live so designers see the
    // selected direction / animation / ease without entering Preview. Gating on
    // useIsStaticRenderer() (true on canvas) is what previously froze it to a
    // flat front face on the canvas.
    // Animate the live cube in Preview, and on the canvas too WHEN autoplay is
    // selected (so the canvas previews the autoplay motion). On the canvas with
    // drag mode — and always for export/thumbnail — render the flat front face
    // (first default or uploaded image). Uses only the supplied images.
    const renderTarget = RenderTarget.current()
    const isStatic =
        renderTarget === RenderTarget.export ||
        renderTarget === RenderTarget.thumbnail ||
        (renderTarget === RenderTarget.canvas && animation !== "autoplay")
    const prefersReducedMotion = useReducedMotion()

    // `animation` picks the interaction: autoplay rotates on its own, drag
    // lets the user swipe. Exactly one is active.
    const autoPlay = animation === "autoplay"
    const enableDrag = animation === "drag"
    // The original autoplay makes a short run of side turns before one
    // downward turn, rather than alternating the axis on every move.
    // Keep the supplied `direction` for drag / keyboard use.
    const [autoplayDirectionIndex, setAutoplayDirectionIndex] = useState(0)
    const activeDirection: Direction =
        autoPlay && autoplayDirectionIndex % 5 === 4 ? "bottom" : direction

    // ---- Items (padded so we always have at least 4 faces' worth) ----------
    const items = useMemo(() => padItems(rawItems), [rawItems])
    const itemCount = items.length

    // ---- Resolved transitions ---------------------------------------------
    // The base rotation transition. Reduced-motion → duration 0 (instant).
    const transition: CarouselTransition = useMemo(
        () =>
            transitionOverride ??
            (prefersReducedMotion
                ? { duration: 0 }
                : (ease ?? {
                      duration: 1.25,
                      ease: DEFAULT_EASE,
                  })),
        [transitionOverride, ease, prefersReducedMotion]
    )

    // Snap-back spring used when a drag falls short of crossing into the next
    // face. Fixed config; programmatic override still wins.
    const snapTransition: CarouselTransition = useMemo(
        () =>
            snapTransitionOverride ?? {
                type: "spring",
                damping: prefersReducedMotion ? 100 : 30,
                stiffness: prefersReducedMotion ? 1000 : 200,
            },
        [snapTransitionOverride, prefersReducedMotion]
    )

    // Cube / face size in px — every face renders at exactly imageWidth ×
    // imageHeight; the cube is centered inside the component's frame.
    const cubeW = Math.max(1, imageWidth ?? 350)
    const cubeH = Math.max(1, imageHeight ?? 250)

    // Direction-axis logic.
    // - "left" / "right" rotate around the Y axis (horizontal carousel).
    // - "top" / "bottom" rotate around the X axis (vertical carousel).
    // - "left" and "top" are the "forward" directions (next() rotates toward
    //   them); "right" and "bottom" are reverse.
    const isHorizontal =
        activeDirection === "left" || activeDirection === "right"
    const isForward =
        activeDirection === "left" || activeDirection === "top"

    // Match the original Box Carousel geometry: horizontal rotations use the
    // face width as depth and vertical rotations use its height.
    const depth = isHorizontal ? cubeW : cubeH
    const halfDepth = depth / 2

    // ---- Index + rotation state -------------------------------------------
    // `currentIndex` = the carousel item index currently on the FRONT face.
    // `rotation` (in degrees) is animated continuously; we don't reset it to
    // 0 between steps. Each "next" subtracts 90°, each "prev" adds 90° (for
    // forward direction; reversed otherwise).
    const [currentIndex, setCurrentIndexState] = useState(0)
    // Mirror of currentIndex in a ref so navigate/drag callbacks read the
    // latest index without closing over stale state — this is what prevents
    // the index and `frontSlotRef` from drifting out of sync (the cause of
    // the "wrong image mid-move, corrects on stop" glitch). Always update both
    // through `setCurrentIndex`.
    const currentIndexRef = useRef(0)
    const setCurrentIndex = useCallback((i: number) => {
        currentIndexRef.current = i
        setCurrentIndexState(i)
    }, [])
    const rotation = useMotionValue(0)

    // Track the four FACE → ITEM assignments. The cube has 4 faces; as the
    // user rotates we update which item each face shows so we always have
    // current/prev/next/next-next visible across the four sides.
    //
    // Face slots (positions on the cube, identified by their initial rotation
    // angle relative to the front face — these stay fixed; only their item
    // contents rotate):
    //   slot 0: front  (0°)
    //   slot 1: right  (+90°  on Y axis)   or  bottom (-90° on X axis)
    //   slot 2: back   (+180°)
    //   slot 3: left   (-90° on Y axis)    or  top    (+90° on X axis)
    //
    // We rotate the WHOLE cube by `rotation` degrees. The visible (front-
    // facing) slot at any time depends on the current rotation value.

    // Compute, for each of the 4 face slots, which item index it should
    // display given the currentIndex. The slot in front of the camera should
    // always show `currentIndex`. The slot that will rotate into view next
    // should show `currentIndex + 1` (forward) or `currentIndex - 1` (reverse).
    //
    // Because the cube is rotated by a multiple of 90° between steps, after
    // each step the "front" slot in screen-space is a different physical face
    // slot. We track this with `frontSlotRef` so we can update the right
    // slot's contents post-rotation.
    const frontSlotRef = useRef(0)

    // Face → item mapping. Initialized so all four faces have something
    // sensible at mount, then updated as we navigate.
    const [faceItems, setFaceItems] = useState<number[]>(() => {
        // Front gets index 0; the slot that rotates into view next gets index 1;
        // the slot opposite (back) gets the prev item; the remaining slot gets
        // the next-next item. This way drag in either direction immediately
        // shows something coherent.
        const n = Math.max(1, itemCount)
        return [0, 1 % n, modIdx(2, n), modIdx(-1, n)]
    })

    // ---- Imperative navigation (used internally + by trigger props) -------
    const isAnimatingRef = useRef(false)

    // The rotation step per navigation (in degrees). Negative for forward,
    // positive for reverse. For Y-axis (horizontal), positive rotation looks
    // like the cube turning to the right (camera sees the left face come in);
    // we want "left" direction = next moves the next face in from the right,
    // i.e. cube rotates left (-90°). For X-axis, "top" = next means the next
    // face appears at the top, i.e. cube rotates up (+90°).
    const stepDegrees = useMemo(() => {
        if (isHorizontal) {
            return isForward ? -90 : 90
        }
        return isForward ? 90 : -90
    }, [isHorizontal, isForward])

    // After a step, which physical face slot is now in front?
    // Slots are arranged at 0°/90°/180°/270° around the rotation axis. When
    // the cube rotates by -90° (e.g. left), the slot that WAS at +90° is now
    // in front. So front_new = (front_old + 1) mod 4 for -90° steps, and
    // (front_old + 3) mod 4 for +90° steps.
    const advanceFrontSlot = useCallback((deltaDeg: number) => {
        const norm = ((deltaDeg % 360) + 360) % 360 // 0..360
        if (norm === 90) {
            frontSlotRef.current = (frontSlotRef.current + 3) % 4
        } else if (norm === 270) {
            // i.e. -90°
            frontSlotRef.current = (frontSlotRef.current + 1) % 4
        } else if (norm === 180) {
            frontSlotRef.current = (frontSlotRef.current + 2) % 4
        }
    }, [])

    // Which physical face slot ends up in front after rotating the cube by
    // `deltaDeg`, starting from `fromSlot`. Pure version of advanceFrontSlot.
    const incomingFrontSlot = useCallback(
        (deltaDeg: number, fromSlot: number) => {
            const norm = ((deltaDeg % 360) + 360) % 360
            if (norm === 90) return (fromSlot + 3) % 4
            if (norm === 270) return (fromSlot + 1) % 4
            if (norm === 180) return (fromSlot + 2) % 4
            return fromSlot
        },
        []
    )

    // Deterministically assign all four faces from the current index + which
    // physical slot is in front. The front shows `curIdx`; the slot that will
    // rotate in on next() shows curIdx+1, on prev() curIdx-1, and the hidden
    // back face curIdx+2. Rebuilt on every step / drag-start so NO face is
    // ever stale — that's what eliminates the "wrong image then jump" glitch.
    const buildFaces = useCallback(
        (curIdx: number): number[] => {
            const n = Math.max(1, itemCount)
            const fs = frontSlotRef.current
            const fwd = incomingFrontSlot(stepDegrees, fs)
            const bwd = incomingFrontSlot(-stepDegrees, fs)
            const back = (fs + 2) % 4
            const faces = [0, 0, 0, 0]
            faces[fs] = modIdx(curIdx, n)
            faces[fwd] = modIdx(curIdx + 1, n)
            faces[bwd] = modIdx(curIdx - 1, n)
            faces[back] = modIdx(curIdx + 2, n)
            return faces
        },
        [itemCount, stepDegrees, incomingFrontSlot]
    )

    // Keep faces correct whenever the cube geometry changes (direction or item
    // count) and on mount. Per-step rebuilds happen in navigate / drag commit.
    useEffect(() => {
        setFaceItems(buildFaces(currentIndex))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildFaces])

    // Core navigation: animate the rotation by ±stepDegrees and update state.
    const navigate = useCallback(
        (dir: "next" | "prev", cycleAutoplayAxis = false) => {
            if (isAnimatingRef.current) return
            if (itemCount === 0) return

            const delta = dir === "next" ? stepDegrees : -stepDegrees
            const from = rotation.get()
            const to = from + delta

            const cur = currentIndexRef.current
            const newIndex = modIdx(
                dir === "next" ? cur + 1 : cur - 1,
                itemCount
            )

            // Faces are kept correct at rest, so the incoming face already
            // shows the right item — no pre-populate needed.
            isAnimatingRef.current = true

            const controls = animate(rotation, to, {
                ...transition,
                onComplete: () => {
                    isAnimatingRef.current = false
                    advanceFrontSlot(delta)
                    setCurrentIndex(newIndex)
                    setFaceItems(buildFaces(newIndex))
                    onIndexChange?.(newIndex)
                    if (cycleAutoplayAxis) {
                        setAutoplayDirectionIndex((index) => index + 1)
                    }
                },
            })
            return controls
        },
        [
            itemCount,
            stepDegrees,
            rotation,
            transition,
            advanceFrontSlot,
            buildFaces,
            setCurrentIndex,
            onIndexChange,
        ]
    )

    // ---- Autoplay ---------------------------------------------------------
    // Cadence comes entirely from `ease`: a short poll fires the next move
    // only when no animation is in flight, and each move's animation lasts
    // ease.delay (delay before it starts) + ease.duration (the move). So the
    // gap between auto-advances == the ease transition length.
    useEffect(() => {
        if (isStatic) return
        if (!autoPlay) return
        if (itemCount <= 1) return
        const id = window.setInterval(() => {
            if (!isAnimatingRef.current) navigate("next", true)
        }, 100)
        return () => window.clearInterval(id)
    }, [isStatic, autoPlay, navigate, itemCount])

    // ---- Keyboard navigation ----------------------------------------------
    // Listens on window when the component is focused or hovered. Source uses
    // arrow keys mapped to direction: Left/Right always work for horizontal
    // direction, Up/Down for vertical. We do the same.
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const isHoveredRef = useRef(false)

    useEffect(() => {
        if (isStatic) return
        const onKey = (e: KeyboardEvent) => {
            if (!isHoveredRef.current) return
            if (isHorizontal) {
                if (e.key === "ArrowLeft") {
                    e.preventDefault()
                    navigate(isForward ? "next" : "prev")
                } else if (e.key === "ArrowRight") {
                    e.preventDefault()
                    navigate(isForward ? "prev" : "next")
                }
            } else {
                if (e.key === "ArrowUp") {
                    e.preventDefault()
                    navigate(isForward ? "next" : "prev")
                } else if (e.key === "ArrowDown") {
                    e.preventDefault()
                    navigate(isForward ? "prev" : "next")
                }
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [isStatic, isHorizontal, isForward, navigate])

    // ---- Drag / swipe -----------------------------------------------------
    // We listen to pointer events on the cube container. On drag along the
    // active axis, we update `rotation` directly (in degrees) using:
    //   degrees = (pixelDelta / depth) * 90 * dragSensitivity
    // As the cube crosses each 45° half-step the index/faces are stepped LIVE
    // (applyStep), so the face on screen is always the real current item — any
    // drag distance works. On release we settle the rotation onto that face
    // (or spring back to the start if no face was crossed).
    const dragStateRef = useRef<{
        active: boolean
        pointerId: number
        startX: number
        startY: number
        startRotation: number
        // Whole 90° steps already applied to the index/faces during this drag.
        // Lets the carousel step LIVE as the cube crosses face boundaries, so
        // any drag distance lands on the face actually on screen.
        committedSteps: number
    } | null>(null)

    // Apply one face step (no rotation animation — the drag drives rotation).
    // Updates the front slot, current index and all faces so content stays
    // correct however far the user drags.
    const applyStep = useCallback(
        (dir: "next" | "prev") => {
            const deltaSlot = dir === "next" ? stepDegrees : -stepDegrees
            advanceFrontSlot(deltaSlot)
            const cur = currentIndexRef.current
            const ni = modIdx(
                dir === "next" ? cur + 1 : cur - 1,
                Math.max(1, itemCount)
            )
            setCurrentIndex(ni)
            setFaceItems(buildFaces(ni))
        },
        [stepDegrees, itemCount, advanceFrontSlot, setCurrentIndex, buildFaces]
    )

    const onPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!enableDrag || isStatic) return
            if (isAnimatingRef.current) return
            if (e.button !== 0 && e.pointerType === "mouse") return
            const el = e.currentTarget
            try {
                el.setPointerCapture(e.pointerId)
            } catch {}
            dragStateRef.current = {
                active: true,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startRotation: rotation.get(),
                committedSteps: 0,
            }
            // Make sure BOTH neighbours are loaded before the drag moves, so
            // whichever way the user swipes the incoming face is already right.
            setFaceItems(buildFaces(currentIndexRef.current))
        },
        [enableDrag, isStatic, rotation, buildFaces]
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const s = dragStateRef.current
            if (!s || !s.active || s.pointerId !== e.pointerId) return
            const dx = e.clientX - s.startX
            const dy = e.clientY - s.startY
            const axisDelta = isHorizontal ? dx : dy
            // Forward directions (left, top) rotate by NEGATIVE step degrees
            // on next(); a forward drag should match. We multiply axisDelta
            // by the sign so dragging in the "forward" direction (e.g. left
            // for direction=left, up for direction=top) advances.
            //
            // For direction="left", forward means dragging LEFT (dx negative)
            // → next. So drag in -x => rotation goes NEGATIVE (matching
            // stepDegrees=-90 for next).
            //
            // For direction="right", forward means dragging RIGHT (dx
            // positive) → next. stepDegrees=+90, drag in +x => rotation
            // positive. Same sign relationship.
            //
            // For direction="top", forward = drag UP (dy negative) → next.
            // stepDegrees=+90, so we need to NEGATE dy for vertical so a
            // -dy maps to +rotation.
            //
            // Easier: rotation delta in degrees = (axisDelta / depth) * 90
            // multiplied by a per-direction sign:
            const sign = (() => {
                if (direction === "left") return -1 // drag left (negative dx) → rotation negative (next)
                if (direction === "right") return 1
                if (direction === "top") return -1 // drag up (negative dy) → rotation positive (next, stepDegrees=+90)
                return 1 // bottom: drag down (positive dy) → rotation negative (next, stepDegrees=-90)
            })()
            // For "top" with sign=-1 and stepDegrees=+90: dragging up
            // (dy<0) gives rotationDelta = -dy * (90/depth) > 0 ✓
            // For "bottom" with sign=1 and stepDegrees=-90: dragging down
            // (dy>0) gives rotationDelta = +dy * (90/depth) > 0, but we want
            // it negative... Re-check: direction="bottom" => isForward=false,
            // stepDegrees = -isHorizontal? -(-90):... wait.
            //
            // From earlier: stepDegrees for "bottom" (isHorizontal=false,
            // isForward=false) = isForward ? 90 : -90 = -90.
            // We want next() to drag DOWN. Drag down = dy positive.
            // navigate("next") rotates by stepDegrees=-90. So a forward
            // drag (dy>0) should accumulate rotation toward -90, i.e. drag
            // delta should be NEGATIVE. So sign for "bottom" should be -1.
            //
            // Re-doing the sign table cleanly with first principles:
            //   forward drag direction in screen → next() should fire
            //   next() animates rotation by stepDegrees
            //   so: axisDelta during forward drag and stepDegrees should
            //   have the SAME sign once multiplied by `sign`.
            //
            //   direction=left:  forward drag = -dx (drag left, dx<0)
            //                    stepDegrees = -90
            //                    => need: sign * dx with same sign as -90
            //                       when dx<0, so sign * dx must be < 0
            //                       when dx<0  → sign > 0 means sign*dx < 0 ✓
            //                    sign = +1? But then sign * dx with dx>0
            //                    gives +ve rotation, which is prev for left
            //                    (stepDegrees=+90 for prev=−next=+90). ✓
            //
            // Recomputing properly:
            //   direction=left:  sign = +1, axis = x
            //     forward drag (next) = drag left (dx<0) → rotation -90 over depth
            //     dragDeg = (dx/depth)*90 = negative ✓ matches stepDegrees=-90
            //
            //   direction=right: sign = -1? Let's check.
            //     forward drag = drag right (dx>0) → next, stepDegrees=+90
            //     With sign=+1 we'd get dragDeg = +ve, matches +90 ✓
            //     So sign = +1 here too.
            //
            //   direction=top:   axis = y
            //     forward drag = drag up (dy<0) → next, stepDegrees=+90
            //     With sign=+1: dragDeg = (dy/depth)*90, dy<0 gives -ve.
            //     We want +ve. So sign = -1 here.
            //
            //   direction=bottom:
            //     forward drag = drag down (dy>0) → next, stepDegrees=-90
            //     With sign=+1: dragDeg = +ve, want -ve. So sign = -1 here.
            //
            // Updated table: left=+1, right=+1, top=-1, bottom=-1. So sign
            // is purely a function of axis (Y axis flips because screen Y is
            // inverted from math Y). Override my earlier reasoning:
            const correctedSign = isHorizontal ? 1 : -1
            // Sensitivity control is 1–10; scale to a 0.5–5.0 multiplier so
            // even 1 has decent pull and 10 spins fast.
            const sens = Math.max(1, Math.min(10, dragSensitivity ?? 5)) * 0.5
            const dragDeg =
                ((axisDelta * correctedSign) / Math.max(1, depth)) * 90 * sens
            rotation.set(s.startRotation + dragDeg)

            // Step the index/faces LIVE as the cube crosses each face boundary.
            // `want` = net whole faces moved in the next() direction so far
            // (one next() == `stepDegrees` of rotation). Apply the difference
            // from what's already committed so content tracks the visible face.
            const want = Math.round(dragDeg / stepDegrees)
            while (s.committedSteps < want) {
                applyStep("next")
                s.committedSteps++
            }
            while (s.committedSteps > want) {
                applyStep("prev")
                s.committedSteps--
            }
        },
        [isHorizontal, depth, dragSensitivity, rotation, stepDegrees, applyStep]
    )

    const onPointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const s = dragStateRef.current
            if (!s || !s.active || s.pointerId !== e.pointerId) return
            const el = e.currentTarget
            try {
                el.releasePointerCapture(e.pointerId)
            } catch {}
            dragStateRef.current = null

            // The index + faces were already stepped LIVE during the drag, so
            // the face on screen is `currentIndex`. Settle the rotation onto
            // that face — the nearest 90° multiple to where we committed.
            const target = s.startRotation + s.committedSteps * stepDegrees
            isAnimatingRef.current = true

            if (s.committedSteps === 0) {
                // No face crossed — spring back to where the drag started.
                animate(rotation, target, {
                    ...snapTransition,
                    onComplete: () => {
                        isAnimatingRef.current = false
                    },
                })
                return
            }

            onIndexChange?.(currentIndexRef.current)
            animate(rotation, target, {
                ...transition,
                // Settle immediately — no pre-move delay (the ease `delay` is
                // for autoplay pacing, not manual swipes).
                delay: 0,
                onComplete: () => {
                    isAnimatingRef.current = false
                },
            })
        },
        [rotation, stepDegrees, transition, snapTransition, onIndexChange]
    )

    // ---- Per-slot transform ------------------------------------------------
    // Each face slot has a STATIC base orientation around the rotation axis.
    // Slot k is at base angle k * 90°. The whole cube is then rotated by
    // `rotation`, so the final transform per face is:
    //   translateZ(halfDepth) rotateAxis(baseAngle + rotation)
    // We do this by nesting: the cube wrapper applies the global rotation;
    // each face inside applies its own static rotation + translateZ.

    const cubeTransform = useTransform(rotation, (r) => {
        // The source centers the cube at the 3D origin before rotating it.
        // Without this offset a vertical turn rotates around the front face,
        // which makes the whole box appear to shrink.
        if (isHorizontal) return `translateZ(-${halfDepth}px) rotateY(${r}deg)`
        return `translateZ(-${halfDepth}px) rotateX(${r}deg)`
    })

    // Outer frame fills the component and centers the fixed-size cube box.
    const containerStyle: React.CSSProperties = {
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        touchAction: isStatic ? undefined : "none",
        userSelect: "none",
    }

    // The fixed-size box that holds the cube (or the flat static face).
    const cubeBoxStyle: React.CSSProperties = {
        position: "relative",
        width: cubeW,
        height: cubeH,
    }

    const assignContainerRef = (el: HTMLDivElement | null) => {
        wrapperRef.current = el
    }

    // ---- Static-renderer short-circuit ------------------------------------
    // On the Framer canvas / export, render a single flat face (the current
    // item) with no 3D, drag, autoplay, or keyboard handling. Designers see
    // a representative image.
    if (isStatic) {
        const idx = modIdx(currentIndex, Math.max(1, itemCount))
        const item = items[idx]
        return (
            <div
                ref={assignContainerRef}
                className="framer-box-carousel"
                style={containerStyle}
            >
                <div
                    style={{
                        ...cubeBoxStyle,
                        overflow: "hidden",
                        background: "#111",
                    }}
                >
                    <FaceContent item={item} />
                </div>
            </div>
        )
    }

    // ---- Render -----------------------------------------------------------
    // IMPORTANT 3D-scene rules enforced below:
    // 1. The OUTER container holds the `perspective` and MUST have
    //    `overflow: visible`. With `overflow: hidden` the side faces (which
    //    swing OUTSIDE the front-face's 2D bounding box during rotation) get
    //    clipped, collapsing the cube into a flat image swap.
    // 2. The cube wrapper carries `transformStyle: preserve-3d` so the four
    //    faces keep their independent 3D positions (without it the faces
    //    flatten onto the wrapper's plane).
    // 3. Each face uses `translateZ(halfDepth)` to sit on the cube's outer
    //    surface and `backface-visibility: hidden` so the back of a face
    //    doesn't bleed through during the rotation.
    return (
        <div
            ref={assignContainerRef}
            className="framer-box-carousel"
            tabIndex={0}
            onMouseEnter={() => {
                isHoveredRef.current = true
            }}
            onMouseLeave={() => {
                isHoveredRef.current = false
            }}
            onFocus={() => {
                isHoveredRef.current = true
            }}
            onBlur={() => {
                isHoveredRef.current = false
            }}
            style={{
                ...containerStyle,
                // Must be visible — the cube's side faces extend beyond the
                // front-face bounding box during rotation. Clipping here is
                // what makes the carousel look "flat".
                overflow: "visible",
                cursor: enableDrag ? "grab" : "default",
                perspective: "1000px",
                perspectiveOrigin: "50% 50%",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            <motion.div
                style={{
                    ...cubeBoxStyle,
                    // CRITICAL: without preserve-3d the faces flatten onto
                    // the wrapper's 2D plane and the cube degenerates into a
                    // single rotating image.
                    transformStyle: "preserve-3d",
                    transform: cubeTransform,
                    // No overflow clipping here either — side faces poke out
                    // of this box during rotation.
                    // Origin: center of the cube along the rotation axis. For
                    // Y-axis rotation we want the rotation axis to run through
                    // the cube's horizontal center, depth halfDepth into the
                    // screen. Default transform-origin (center center) plus
                    // the per-face translateZ(halfDepth) achieves that.
                }}
            >
                {[0, 1, 2, 3].map((slot) => {
                    // Base angle for this slot, in degrees.
                    const baseAngle = slot * 90
                    const axis = isHorizontal ? "Y" : "X"
                    const itemIdx = faceItems[slot] ?? 0
                    const item = items[modIdx(itemIdx, Math.max(1, itemCount))]
                    return (
                        <div
                            key={slot}
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                // preserve-3d on a face is unnecessary (faces
                                // don't have 3D children), but harmless.
                                transformStyle: "preserve-3d",
                                transform: `rotate${axis}(${baseAngle}deg) translateZ(${halfDepth}px)`,
                                backfaceVisibility: "hidden",
                                // overflow:hidden HERE is fine — it just clips
                                // the image to the face's rectangle. Never put
                                // it on the cube wrapper or outer container.
                                overflow: "hidden",
                                background: "#000",
                                // A subtle inset edge so the boundaries
                                // between faces are visible even on solid
                                // images — sells the "real cube" look during
                                // rotation when two faces are visible at once.
                                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
                            }}
                        >
                            <FaceContent item={item} />
                        </div>
                    )
                })}
            </motion.div>
        </div>
    )
}

// -----------------------------------------------------------------------------
// FaceContent — renders one item (image or video) inside a face. Factored out
// so the static renderer and live cube can share it.
// -----------------------------------------------------------------------------

function FaceContent({ item }: { item: CarouselItem | undefined }) {
    if (!item) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    background: "#111",
                }}
            />
        )
    }

    if (item.type === "video") {
        const src =
            (item.srcUrl && item.srcUrl.trim()) || resolveImageSrc(item.src)
        const poster = resolveImageSrc(item.poster)
        return (
            <video
                src={src}
                poster={poster || undefined}
                muted
                playsInline
                loop
                autoPlay
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        )
    }

    // image
    const src = (item.srcUrl && item.srcUrl.trim()) || resolveImageSrc(item.src)
    const srcSet = resolveImageSrcSet(item.src)
    if (!src) {
        return <MediaPlaceholder label={item.alt || "Add an image"} />
    }
    return (
        <img
            src={src}
            srcSet={srcSet}
            alt={item.alt || ""}
            draggable={false}
            style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
                userSelect: "none",
            }}
        />
    )
}

function MediaPlaceholder({ label }: { label: string }) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                boxSizing: "border-box",
                background:
                    "linear-gradient(135deg, #1f2937 0%, #111827 55%, #0f172a 100%)",
                color: "rgba(255,255,255,0.72)",
                fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                textAlign: "center",
                pointerEvents: "none",
                userSelect: "none",
            }}
        >
            {label}
        </div>
    )
}

// -----------------------------------------------------------------------------
// Defaults + property controls
// -----------------------------------------------------------------------------

const COMPONENT_DEFAULTS = {
    items: DEFAULT_ITEMS,
    imageWidth: 500,
    imageHeight: 300,
    direction: "right",
    animation: "autoplay",
    ease: {
        type: "tween",
        duration: 1,
        delay: 0,
        ease: [0.44, 0, 0.56, 1],
    },
    dragSensitivity: 5,
}

class Vector2 {
    constructor(public x: number, public y: number) {} 
}

class Rectangle {
    constructor(public x: number, public y: number, public w: number, public h: number) {}
    static from(origin: Vector2, size: Vector2) {
        return new Rectangle(origin.x, origin.y, size.x, size.y)
    }

    contains(point: Vector2) {
        return (
            point.x < this.x + this.w &&
            point.y < this.y + this.h &&
            point.x > this.x &&
            point.y > this.y
        )
    }
}

class Component {
    constructor() {
    }
}

class Position extends Component {
    constructor(public position: Vector2) {
        super()
    }
}

class Size extends Component {
    constructor(public size: Vector2) {
        super()
    }
}

class DisplayFrame extends Component {
    constructor(public innerPosition: Vector2) {
        super()
    }
}

class GridPosition extends Component {
    constructor(public column: number, public line: number) {
        super()
    }
}

class DisplayPlane extends Component {
    constructor(public plane: EntityId) {
        super()
    }
}

class Sprite extends Component {
    constructor(public image: HTMLImageElement) {
        super()
    }
}

class Label extends Component {
    constructor(
        public label: string) {
        super()
    }
}

class Dragged extends Component {
}

class Draggable extends Component {
    // Flag for draggable tile
}

class Canvas extends Component {
    constructor(public ctx: CanvasRenderingContext2D, public canvas: HTMLCanvasElement) {
        super()
    }

    static fromId(id: string): Canvas {
        const canvas = document.getElementById(id) as HTMLCanvasElement|null
        const ctx = canvas?.getContext("2d") as CanvasRenderingContext2D|null

        if (ctx === null || canvas === null) {
            throw new Error("Cannot acquire canvas handle")
        }

        return new Canvas(ctx, canvas)
    }
}

class PlayerProperties extends Component {
    constructor(public playerName: string) {
        super()
    }
}

type EntityId = number

type Class<T> = new (...args: any[]) => T
type Optional<T> = T | undefined

class World {
    registry = new Map<string, Map<number, Component>>()
    lastId = 0

    register(entityId: EntityId, component: Component) {
        const componentName = component.constructor.name
        if (!this.registry.has(componentName)) {
            this.registry.set(componentName, new Map())
        }

        this.registry.get(componentName)?.set(entityId, component)
    }

    rescind(entityId: EntityId, componentName: string) {
        if (!this.registry.has(componentName)) {
            this.registry.set(componentName, new Map())
        }

        this.registry.get(componentName)?.delete(entityId)
    }

    entity(components: Array<Component>): number {
        const entityId = ++this.lastId as EntityId

        for(let component of components) {
            this.register(entityId, component)
        }

        return entityId
    }

    locate<Type>(id: EntityId, type: Class<Type>): Optional<Type> {
        return this.registry.get(type.name)?.get(id) as Optional<Type>
    }

    query<Type>(type: Class<Type>): IterableIterator<Type> {
        const components = this.registry.get(type.name)
        if (components !== undefined) {
            return components.values() as IterableIterator<Type>
        } else {
            return new Array().values()
        }
    }

    queryE<Type>(type: Class<Type>): IterableIterator<[EntityId, Type]> {
        const components = this.registry.get(type.name)
        if (components !== undefined) {
            return components.entries() as IterableIterator<[EntityId, Type]>
        } else {
            return new Array().values()
        }
    }

    *queryEN(primaryType: Class<Component>, otherTypes: Array<Class<Component>>): IterableIterator<Array<any>> {
        const primaryComponents = this.registry.get(primaryType.name)
        if (primaryComponents === undefined) {
            return new Array().values()
        }
        for (const [entityId, primary] of primaryComponents.entries()) {
            let components = [entityId, primary].concat(otherTypes.map(t => this.locate(entityId, t)))
            yield components as Array<Optional<Component>>
        }
    }

    *queryN(primaryType: Class<Component>, otherTypes: Array<Class<Component>>): IterableIterator<Array<Optional<Component>>> {
        const primaryComponents = this.registry.get(primaryType.name)
        if (primaryComponents === undefined) {
            return new Array().values()
        }
        for (const [entityId, primary] of primaryComponents.entries()) {
            let components = [primary].concat(otherTypes.map(t => this.locate(entityId, t)))
            yield components as Array<Optional<Component>>
        }
    }

    query2<Type1, Type2>(type1: Class<Type1>, type2: Class<Type2>): IterableIterator<[Type1, Optional<Type2>]> {
        return this.queryN(type1 as Class<Component>, [type2 as Class<Component>]) as IterableIterator<[Type1, Optional<Type2>]>
    }

    query3<Type1, Type2, Type3>(type1: Class<Type1>, type2: Class<Type2>, type3: Class<Type3>): IterableIterator<[Type1, Optional<Type2>, Optional<Type3>]> {
        return this.queryN(type1 as Class<Component>, [type2 as Class<Component>, type3 as Class<Component>]) as IterableIterator<[Type1, Optional<Type2>, Optional<Type3>]>
    }

    queryE3<Type1, Type2, Type3>(type1: Class<Type1>, type2: Class<Type2>, type3: Class<Type3>): IterableIterator<[EntityId, Type1, Optional<Type2>, Optional<Type3>]> {
        return this.queryEN(type1 as Class<Component>, [type2 as Class<Component>, type3 as Class<Component>]) as IterableIterator<[EntityId, Type1, Optional<Type2>, Optional<Type3>]>
    }

    queryUnique<Type>(type: Class<Type>): Type {
        const components = this.registry.get(type.name)
        if (components !== undefined) {
            return components.values().next().value as Type
        } else {
            throw new Error(`Component not registered: ${type.name}`)
        }
    }
}

class System {
    onFrame(world: World, delta: number): void {}
    onMouseMove(world: World, event: MouseEvent): void {}
    onMouseUp(world: World, event: MouseEvent): void {}
    onMouseDown(world: World, event: MouseEvent): void {}
}

class SystemRegistry extends System {
    constructor(public systems = new Array<System>()) {
        super()
    }

    onFrame(world: World, delta: number): void {
        for (const system of this.systems) {
            system.onFrame(world, delta)
        }
    }

    onMouseDown(world: World, event: MouseEvent): void {
        for (const system of this.systems) {
            system.onMouseDown(world, event)
        }
    }

    onMouseMove(world: World, event: MouseEvent): void {
        for (const system of this.systems) {
            system.onMouseMove(world, event)
        }
    }

    onMouseUp(world: World, event: MouseEvent): void {
        for (const system of this.systems) {
            system.onMouseUp(world, event)
        }
    }
}

class AssetStore {
    image(name: string): HTMLImageElement {
        const img = new Image()
        img.src = `./assets/${name}.png`
        return img
    }
}

class GridPositionSystem extends System {
    onFrame(world: World, delta: number): void {
        for (const [cGrid, cPosition, cDragged] of world.query3(GridPosition, Position, Dragged)) {
            if (cDragged === undefined) {
                cPosition!.position.x = cGrid.column * 64
                cPosition!.position.y = cGrid.line * 64
            }
        }
    }
}

class CanvasSystem extends System {
    private screenPosition(frames: Map<EntityId, DisplayFrame>, cPosition: Position, cPlane?: DisplayPlane): Vector2 {
        if (cPlane === undefined) {
            return cPosition.position
        }
        const frameStart = frames.get(cPlane?.plane)?.innerPosition
        return new Vector2(cPosition.position.x - frameStart!.x, cPosition.position.y - frameStart!.y)
    }

    onFrame(world: World, delta: number): void {
        const cCanvas = world.queryUnique(Canvas)
        const ctx = cCanvas.ctx

        const frames = new Map(world.queryE(DisplayFrame))

        ctx.clearRect(0, 0, cCanvas.canvas.width, cCanvas.canvas.height)
        ctx.fillStyle = "green"
        ctx.fillRect(10, 10, 150, 200)

        for (const [cSprite, cPosition, cPlane] of world.query3(Sprite, Position, DisplayPlane)) {
            const position = this.screenPosition(frames, cPosition!, cPlane)
            ctx.drawImage(cSprite.image, position.x, position.y)
        }

        for (const [cLabel, cPosition, cPlane] of world.query3(Label, Position, DisplayPlane)) {
            const position = this.screenPosition(frames, cPosition!, cPlane)
            ctx.font = "48px serif"
            ctx.fillStyle = "black"
            ctx.fillText(cLabel.label, position.x + 15, position.y + 48)
        }
    }
}

class ScrollDragSystem extends System {
    onMouseMove(world: World, event: MouseEvent): void {
        if (event.buttons & 2) {
            // RMB Drag
            const frame = world.queryUnique(DisplayFrame)
            frame.innerPosition.x -= event.movementX
            frame.innerPosition.y -= event.movementY
        }
    }
}

class TileDragSystem extends System {
    private screenPosition(frames: Map<EntityId, DisplayFrame>, cPosition: Position, cPlane?: DisplayPlane): Vector2 {
        // TODO refactor this
        if (cPlane === undefined) {
            return cPosition.position
        }
        const frameStart = frames.get(cPlane?.plane)?.innerPosition
        return new Vector2(cPosition.position.x - frameStart!.x, cPosition.position.y - frameStart!.y)
    }

    onMouseMove(world: World, event: MouseEvent): void {
        for (const [_, cPosition] of world.query2(Dragged, Position)) {
            cPosition!.position.x += event.movementX
            cPosition!.position.y += event.movementY
        }
    }

    onMouseDown(world: World, event: MouseEvent): void {
        const frames = new Map(world.queryE(DisplayFrame))

        for (const [eid, _, cPosition, cPlane] of world.queryE3(Draggable, Position, DisplayPlane)) {
            const position = this.screenPosition(frames, cPosition!, cPlane)
            if (Rectangle.from(position, new Vector2(64, 64)).contains(new Vector2(event.clientX, event.clientY))) {
                world.register(eid, new Dragged())
            }
        }
    }

    onMouseUp(world: World, event: MouseEvent): void {
        const player = world.queryUnique(PlayerProperties)

        for (const [eid, _, cPosition, cGrid] of world.queryE3(Dragged, Position, GridPosition)) {
            cGrid!.column = Math.floor((cPosition!.position.x + 32) / 64)
            cGrid!.line = Math.floor((cPosition!.position.y + 32) / 64)
            world.rescind(eid, Dragged.name)
            console.log(`${player.playerName} moving ${eid} to ${cGrid!.column}, ${cGrid!.line}`)
        }
    }
}

function main() {
    const a = new AssetStore()
    const w = new World()
    const s = new SystemRegistry()

    const frame = w.entity([
        new Position(new Vector2(0, 0)),
        new Size(new Vector2(400, 400)),
        new DisplayFrame(new Vector2(50, 0))
    ])

    function letter(line: number, column: number, label: string): EntityId {
        return w.entity([
            new Position(new Vector2(100, 0)),
            new GridPosition(column, line),
            new DisplayPlane(frame),
            new Sprite(a.image("tile")),
            new Label(label),
            new Draggable()
        ])
    }

    letter(4, 5, "H")
    letter(5, 5, "E")
    letter(6, 5, "L")
    letter(7, 5, "L")
    letter(8, 5, "O")

    w.entity([
        Canvas.fromId("canvas"),
        new PlayerProperties("player1")
    ])

    s.systems.push(new GridPositionSystem())
    s.systems.push(new CanvasSystem())
    s.systems.push(new ScrollDragSystem())
    s.systems.push(new TileDragSystem())

    addEventListener("mousemove", (event) => s.onMouseMove(w, event))
    addEventListener("mouseup", (event) => s.onMouseUp(w, event))
    addEventListener("mousedown", (event) => s.onMouseDown(w, event))

    function animate() {
        requestAnimationFrame(animate)
        s.onFrame(w, 0)
    }

    animate()
}

class Vector2 {
    constructor(public x: number, public y: number) {} 
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

type EntityId = number

type Class<T> = new (...args: any[]) => T
type Optional<T> = T | undefined

class World {
    registry = new Map<string, Map<number, Component>>()
    lastId = 0

    private register(entityId: EntityId, component: Component) {
        const componentName = component.constructor.name
        if (!this.registry.has(componentName)) {
            this.registry.set(componentName, new Map())
        }

        this.registry.get(componentName)?.set(entityId, component)
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
        for (const [cGrid, cPosition] of world.query2(GridPosition, Position)) {
            cPosition!.position.x = cGrid.column * 64
            cPosition!.position.y = cGrid.line * 64
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
            new Label(label)
        ])
    }

    letter(4, 5, "H")
    letter(5, 5, "E")
    letter(6, 5, "L")
    letter(7, 5, "L")
    letter(8, 5, "O")

    w.entity([
        Canvas.fromId("canvas")
    ])

    s.systems.push(new GridPositionSystem())
    s.systems.push(new CanvasSystem())
    s.systems.push(new ScrollDragSystem())

    addEventListener("mousemove", (event) => s.onMouseMove(w, event))
    addEventListener("mouseup", (event) => s.onMouseUp(w, event))

    function animate() {
        requestAnimationFrame(animate)
        s.onFrame(w, 0)
    }

    animate()
}

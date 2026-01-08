export default class Vec2 {
  constructor (x, y) {this.x = x || 0; this.y = y || 0;}
  add = (b) => new Vec2(this.x + b.x, this.y + b.y)
  sub = (b) => this.add(b.scale(-1))
  len = () => Math.sqrt(this.x*this.x + this.y*this.y)
  scale = (s) => new Vec2(this.x*s,this.y*s)
  ortho = () => new Vec2(this.y,-this.x)
  rotate = (deg) =>
            (rad => (
                (cos,sin,{x,y})=>new Vec2(x*cos - y*sin, x*sin + y*cos)
              )(Math.cos(rad), Math.sin(rad), this)
            )(Math.PI * deg / 180)

  angleX = () => Math.atan(this.y / this.x) / (Math.PI/180)
  angleY = () => (90 - Math.abs(this.angleX())) * (this.x > 0 ? 1 : -1)

  static unitVecInDirection = (deg) => new Vec2(0, -1).rotate(deg)
  static Zero = new Vec2();

  static fromPoints({x: x1, y: y1}, {x: x2, y: y2}) {
    const v1 = new Vec2(x1, y1)
    const v2 = new Vec2(x2, y2)
    return v2.sub(v1)
  }
}
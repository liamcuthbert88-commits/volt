export class World {
  static create(): World {
    return new World();
  }

  history(): unknown[] {
    return [];
  }
}

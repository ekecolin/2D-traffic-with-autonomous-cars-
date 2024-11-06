// https://ancientbrain.com/world.php?world=2230793148
// https://www.simplilearn.com/tutorials/artificial-intelligence-tutorial/a-star-algorithm
// https://www.youtube.com/watch?v=aKYlikFAV4k

let gridSize = 21;  // 21x21 cell grid
let cellSize = 35;  // Cell size in pixels
let grid = [];  // 2D array to represent the grid layout (0 = street, 1 = wall)
let cars = [];  // Array to keep track of cars
let visitedCells = new Map(); // Global variable to track visited cells
let globalTimeStep = 0; // Global time step to control movement

// Background noise to simulate traffic
const MUSICFILE = '/uploads/colin110/Carandtrafficsoundeffects.mp3';
AB.backgroundMusic(MUSICFILE);

// Setup function called once to set up canvas and simulation
function setup() {
  createCanvas(gridSize * cellSize, gridSize * cellSize);
  createGrid();  // Creating the grid with streets and walls

  // Create 4 cars with random start and destination positions on streets
  for (let i = 0; i < 4; i++) {
    let startX, startY, destX, destY;

    // Ensures starting position is on a street
    do {
      startX = Math.floor(random(gridSize));
      startY = Math.floor(random(gridSize));
    } while (grid[startY][startX] === 1);

    // Ensures a random destination position is on a street and different from the starting position
    do {
      destX = Math.floor(random(gridSize));
      destY = Math.floor(random(gridSize));
    } while (grid[destY][destX] === 1 || (destX === startX && destY === startY));

    cars.push(new Car(startX, startY, destX, destY)); // Create a car with random start and destination
  }
}

// Draw function continuously updates the canvas
function draw() {
  background(255);
  drawGrid(); 
  
  // Increment global time step to control when each car can move
  globalTimeStep++;

  // Update, move, and display each car
  for (let car of cars) {
    car.update();
    if (globalTimeStep % 30 === 0) { // Move each car once every 30 frames
        car.move();
    }
    car.display();
  }
}

// Creates the grid layout with streets and walls
function createGrid() {
  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = (i % 4 === 0 || j % 4 === 0) ? 0 : 1; // Set street at every 4th row/column
    }
  }
}

// Draws the grid with streets and walls
function drawGrid() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      fill(grid[i][j] === 0 ? 200 : 50);  // Gray for walls, light gray for streets
      stroke(0);
      rect(j * cellSize, i * cellSize, cellSize, cellSize);
    }
  }
}

// Car class handles car behavior, pathfinding, and collision avoidance
class Car {
  constructor(x, y, destX, destY) {
    this.position = createVector(x, y); // cars current position
    this.destination = createVector(destX, destY); // cars destination
    this.path = [];  // Holds the calculated path to the destination
    this.recalculatePath = true;  // Flag to trigger path recalculation
    this.waitCounter = 0;  // Counter for waiting behavior if blocked /////////////
    this.reachedDestination = false; // Flag to track if the destination is reached
    this.id = int(random(1000)); // Unique ID to track each car
    this.visited = new Set(); // Track previously visited cells

    // Cooldown property to limit frequent recalculations
    this.recalculationCooldown = 0; // Cooldown frames before recalculating path again
    this.cooldownFrames = 10; // Number of frames to wait between recalculations
  }

  // This part of the code helps the car decide if it needs to find a new path.
  // Updates path if needed and resets waitCounter when recalculating
  update() {
    if (this.recalculatePath || this.path.length === 0) {
      // Only recalculate if cooldown has expired
      if (this.recalculationCooldown <= 0) {
        visitedCells.delete(this.position.toString());  // Remove from visited /////////////////
        if (this.position.dist(this.destination) >= 1) {  // Check if car is not already at destination
          this.calculatePath();
          this.recalculatePath = false;  // Disable recalculation until needed
          this.waitCounter = 0;  // Reset wait counter when recalculating ///////////
          this.recalculationCooldown = this.cooldownFrames;  // Set cooldown after recalculating
        } else {
          this.path = [];  // Clear path when destination is reached
        }
      } else {
        // Decrement cooldown if waiting to recalculate
        this.recalculationCooldown--;
      }
    }
  }

  // https://www.youtube.com/watch?v=71CEj4gKDnE 
  // https://en.wikipedia.org/wiki/A*_search_algorithm
  // https://www.redblobgames.com/pathfinding/a-star/introduction.html
  // https://www.simplilearn.com/tutorials/artificial-intelligence-tutorial/a-star-algorithm
  // Pathfinding function using A* algorithm, it helps the car find the best route to its destination without hitting walls.
  calculatePath() {
    this.path = [];
    let start = { pos: this.position.copy(), parent: null };
    let openSet = [start];  // Nodes to be evaluated
    let closedSet = [];     // Nodes already evaluated
    let destinationReached = false;

    while (openSet.length > 0 && !destinationReached) {
      // Select node with lowest f score
      let lowestIndex = 0;
      for (let i = 0; i < openSet.length; i++) {
        if (this.f(openSet[i], this.destination) < this.f(openSet[lowestIndex], this.destination)) {
          lowestIndex = i;
        }
      }
      let current = openSet[lowestIndex];

      // Check if destination is reached
      // https://dev.to/codesphere/pathfinding-with-javascript-the-a-algorithm-3jlb
      // https://briangrinstead.com/blog/astar-search-algorithm-in-javascript/
      if (current.pos.dist(this.destination) < 1) {
        destinationReached = true;
        let temp = current;
        while (temp) {  // Retrace steps to create path
          this.path.push(temp.pos.copy());
          temp = temp.parent;
        }
        this.path.reverse();
      }

      openSet.splice(lowestIndex, 1);  // Remove current from openSet
      closedSet.push(current);

      // Add valid neighbors to openSet
      for (let neighbor of this.getNeighbors(current.pos)) {
        if (closedSet.some(n => n.pos.equals(neighbor))) continue;

        let neighborNode = { pos: neighbor, parent: current };
        if (!openSet.some(n => n.pos.equals(neighbor))) {
          openSet.push(neighborNode);
        }
      }
    }

    // Recalculate path if no valid path is found
    if (!destinationReached) {
      this.recalculatePath = true;
    }
  }

  // Gets the four neighboring positions (up, right, down, left) for pathfinding
  getNeighbors(position) {
    let neighbors = [];
    // up, right down, left directions
    const directions = [
      createVector(0, -1), createVector(1, 0),
      createVector(0, 1), createVector(-1, 0)
    ];
    for (let dir of directions) {
      let neighbor = position.copy().add(dir);
      if (this.isValid(neighbor)) {  // Check if neighbor is a valid position
        neighbors.push(neighbor);
      }
    }
    return neighbors;
  }

  // This part checks if a spot is okay for the car to move to. It makes sure it’s not going off the street, into a wall or any car is occupying it.
  isValid(position) {
    if (position.x < 0 || position.x >= gridSize || position.y < 0 || position.y >= gridSize) return false;
    if (grid[position.y][position.x] === 1) return false;

    // Ensure no collision with other cars
    for (let car of cars) {
      if (car !== this && car.position.equals(position)) return false;
    }
    return true;
  }
  
  // https://www.youtube.com/watch?v=icZj67PTFhc
  // https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  // Heuristic (h) function for A* algorithm
  h(current, target) {
    return current.dist(target);  // Uses Euclidean distance
  }

  // f = g + h function for A* algorithm
  // https://cs.stanford.edu/people/eroberts/courses/soco/projects/2003-04/intelligent-search/astar.html
  f(node, target) {
    return this.g(node) + this.h(node.pos, target);
  }

  // g function for A* algorithm (distance from start)
  g(node) {
    let distance = 0;
    let current = node;
    while (current) {  // Count steps back to the start
      distance++;
      current = current.parent;
    }
    return distance;
  }

  // The car moves one step at a time along its path. When it reaches a point, it checks off that point and keeps going.
  move() {
    if (this.path.length > 0 && !this.reachedDestination) {
      let nextStep = this.path[0];
      let nextKey = nextStep.toString();

      // Check if next position is occupied by a car and if theres conflict a recalculation will occur between both cars and if theres no progress a random path will be calculated
      let conflictCar = cars.find(car => car !== this && car.position.equals(nextStep));
      if (conflictCar) {
        if (conflictCar.path.length > 0 && conflictCar.path[0].equals(this.position)) {
          if (frameCount % 2 === 0) {
            this.recalculatePath = true;
          } else {
            conflictCar.recalculatePath = true;
          }
        } else {
          if (random() > 0.5) {
            this.recalculatePath = true;
          }
        }
      } else if (!visitedCells.has(nextKey)) {  // Proceed if no conflict and unvisited
        visitedCells.set(nextKey, this.id);  // Mark cell as visited by this car
        this.position = nextStep;
        this.path.shift();  // Move forward
        visitedCells.delete(this.position.toString());  // Unmark previous cell
      } else {
        this.recalculatePath = true;
      }
    } else {
      this.recalculatePath = true;  // Recalculate if path is empty
    }

    if (this.position.equals(this.destination) && !this.reachedDestination) {
      console.log("success - path found");
      this.reachedDestination = true;
    }
  }

  // Draws the car and its path on the canvas - https://www.youtube.com/watch?v=D1ELEeIs0j8&t=1s
  // https://p5js.org/reference/
  display() {
    stroke(0, 0, 0);
    strokeWeight(3);  
    noFill();
    beginShape();
    for (let step of this.path) {
      vertex(step.x * cellSize + cellSize / 2, step.y * cellSize + cellSize / 2);
    }
    endShape();
    
    // Draw the car as a red block
    fill(255, 0, 0);
    noStroke();
    rect(this.position.x * cellSize, this.position.y * cellSize, cellSize, cellSize);
    
    strokeWeight(1);  // Reset stroke weight
  }
}
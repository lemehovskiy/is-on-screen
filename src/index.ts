type HandlerType<T> = (data?: T) => void;

type OptionsType = {
  threshold: number;
  in: number;
  out: number;
};

type InputElement = HTMLElement;

enum Events {
  defaultEnter = "DEFAULT_ENTER",
  enterUp = "ENTER_UP",
  enterDown = "ENTER_DOWN",
  leaveUp = "LEAVE_UP",
  leaveDown = "LEAVE_DOWN",
}

interface ILiteEvent<T> {
  on(handler: HandlerType<T>): void;
  off(handler: HandlerType<T>): void;
}

class LiteEvent<T> implements ILiteEvent<T> {
  private handlers: HandlerType<T>[] = [];

  public on(handler: HandlerType<T>) {
    this.handlers.push(handler);
  }

  public off(handler: HandlerType<T>) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  public trigger(data?: T) {
    this.handlers.slice(0).forEach((h) => h(data));
  }

  public expose(): ILiteEvent<T> {
    return this;
  }
}

export default class IsOnScreen {
  private el: InputElement;
  private opt: OptionsType;
  private outCount: number;
  private inCount: number;
  private readonly emmit = new LiteEvent<Events>();

  constructor(el: InputElement | null, options?: Partial<OptionsType>) {
    if (el === null) return;
    this.el = el;
    this.opt = {
      threshold: 0,
      in: -1,
      out: -1,
      ...options,
    };
    this.outCount = 0;
    this.inCount = 0;
    this.init();
  }

  private init = (): void => {
    let prevY: null | number = null;
    let prevIntersection = 0;
    const thresholdSets = [];

    for (let i = this.opt.threshold; i <= 1.0; i += 0.05) {
      thresholdSets.push(i);
    }

    let leaveAction: Events | null = null;
    let enterCalled = false;

    const enterCallback = (type: Events) => {
      if (!enterCalled) {
        enterCalled = true;
        if (checkIfReachEnters()) {
          this.emmit.trigger(type);
          checkIfReachCounters();
        }
        if (this.opt.in !== -1) {
          this.inCount += 1;
        }
      }
    };

    const leaveCallback = (type: Events) => {
      if (type) {
        if (checkIfReachLeaves()) {
          this.emmit.trigger(type);
          checkIfReachCounters();
        }
        if (this.opt.out !== -1) {
          this.outCount += 1;
        }
      }
      enterCalled = false;
    };

    const observer = new IntersectionObserver(
      (e) => {
        const { boundingClientRect, intersectionRatio, isIntersecting } = e[0];

        if (isIntersecting) {
          if (prevY === null) {
            enterCallback(Events.defaultEnter);
          } else {
            if (prevY > boundingClientRect.y) {
              if (intersectionRatio > prevIntersection) {
                enterCallback(Events.enterUp);
              } else {
                leaveAction = Events.leaveDown;
              }
            } else {
              if (intersectionRatio < prevIntersection) {
                leaveAction = Events.leaveUp;
              } else {
                enterCallback(Events.enterDown);
              }
            }
          }
        } else {
          leaveCallback(leaveAction);
        }
        prevY = boundingClientRect.y;
        prevIntersection = intersectionRatio;
      },
      { root: null, rootMargin: "0px", threshold: thresholdSets },
    );
    observer.observe(this.el);

    const checkIfReachEnters = () => {
      return this.opt.in === -1 || this.inCount < this.opt.in;
    };

    const checkIfReachLeaves = () => {
      return this.opt.out === -1 || this.outCount < this.opt.out;
    };

    const checkIfReachCounters = () => {
      if (checkIfReachEnters() && checkIfReachLeaves()) {
        observer.unobserve(this.el);
      }
    };
  };

  public get event() {
    return this.emmit.expose();
  }
}

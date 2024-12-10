let state_var_id = 0;

/**
 * @template T
 * @typedef {{ id: number, val: T }} StateVariable
 */

/**
 * @template T
 * @type {{[key: number]: ((value: T) => void)[]}}
 */
const reactive_subscriptions = {};

/**
 * @template T
 * @param {T} value
 * @returns {StateVariable<T>}
 */
export function create_state_var(value) {
  return new Proxy({ id: state_var_id++, val: value }, {
    get(target, key) {
      return target[key];
    },
    set(target, key, value) {
      reactive_subscriptions[target.id]?.forEach(callback => callback(value, target[key]));
      target[key] = value;
      return true;
    }
  });
}

/**
 * @template T
 * @param {StateVariable<T>} state_variable
 * @param {T} value
 */
export function set_state_var(state_variable, value) {
  state_variable.val = value;
}

/**
 * @template T
 * @param {StateVariable<T>} state_variable A function returning a variable that should be listened to
 * @param {(this: HTMLElement, value: T) => void} callback A function to call when the variable changes
 */
export function watch_state_var(state_variable, callback) {
  if (!reactive_subscriptions[state_variable.id]) {
    reactive_subscriptions[state_variable.id] = [];
  }
  reactive_subscriptions[state_variable.id].push(callback);
}

/**
 * @template T, U
 * @param {StateVariable<T>} state_variable
 * @param {(value: T) => StateVariable<U>} derive_function
 * @returns {StateVariable<U>}
 */
export function computed_state_var(state_variable, derive_function) {
  const computed = create_state_var(derive_function(state_variable.val));
  watch_state_var(state_variable, val => computed.val = derive_function(val));
  return computed;
}

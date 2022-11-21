import { createSignal, For } from "solid-js";
import type { Component } from "solid-js";
import {
  createClient,
  defaultExchanges,
  subscriptionExchange,
} from "@urql/core";
import { createClient as createWsClient } from "graphql-ws";
import { pipe, subscribe } from "wonka";

const wsClient = createWsClient({
  url: "ws://localhost:4000/graphql",
});

const client = createClient({
  url: "http://localhost:4000/graphql",
  exchanges: [
    ...defaultExchanges,
    subscriptionExchange({
      forwardSubscription: (operation) => ({
        subscribe: (sink) => ({
          unsubscribe: wsClient.subscribe(operation, sink),
        }),
      }),
    }),
  ],
});

interface Todo {
  id: string;
  done: boolean;
  text: string;
}

const [todos, setTodos] = createSignal<Todo[]>([]);

const TodosSub = `
  subscription TodosSub {
    todos {
      id
      done
      text
    }
  }
`;

const { unsubscribe } = pipe(
  client.subscription(TodosSub),
  subscribe((result) => {
    console.log(result);
    setTodos(result.data.todos);
  })
);

// const { unsubscribe } = pipe(
//   client.subscription(TodosSub,
//     {}
//   ),
//   subscribe((result) => {
//     console.log({ result });
//     setTodos(result.data.todos);
//   })
// );

const App: Component = () => {
  const [text, setText] = createSignal("");

  const onAdd = async () => {
    await client
      .mutation(
        `
      mutation($text: String!) {
        addTodo(text: $text) {
          id
        }
      }`,
        { text: text() }
      )
      .toPromise();
    setText("");
  };

  const toggle = async (id: string, done: boolean) => {
    await client
      .mutation(
        `
      mutation($id: ID!, $done: Boolean!) {
        setDone(id: $id, done: $done) {
          id
        }
      }`,
        { id, done: !done }
      )
      .toPromise();
  };

  return (
    <div>
      <For each={todos()}>
        {({ id, text, done }) => (
          <div>
            <input
              type="checkbox"
              checked={done}
              onclick={() => toggle(id, done)}
            />
            <span>{text}</span>
          </div>
        )}
      </For>
      <div>
        <input
          type="text"
          value={text()}
          onInput={(evt) => setText(evt.currentTarget.value)}
        />
        <button onClick={onAdd}>Add</button>
      </div>
    </div>
  );
};

export default App;

import { createPubSub, createServer } from "@graphql-yoga/node";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const TODOS_CHANNEL = "TODOS_CHANNEL";
const pubSub = createPubSub<{ TODOS_CHANNEL: [payload: Todo[]] }>();

// Hydrate the dataset
const todos: Todo[] = [
  { id: "1", text: "Just a tutorial", done: false },
  { id: "2", text: "Second todo", done: false },
];

const typeDefs = `
  type Todo {
    id: ID!
    text: String!
    done: Boolean!
  }
  type Query {
    getTodos: [Todo]!
  }
  type Mutation {
    addTodo(text: String!): Todo
    setDone(id: ID!, done: Boolean!): Todo
  }
  type Subscription {
    todos: [Todo]!
  }
`;

const resolvers = {
  Query: {
    getTodos: () => todos,
  },
  Mutation: {
    addTodo: (_: unknown, { text }: { text: string }) => {
      const newTodo = {
        id: String(todos.length + 1),
        text,
        done: false,
      };
      todos.push(newTodo);
      // Trigger a channel update
      pubSub.publish(TODOS_CHANNEL, todos);
      return newTodo;
    },
    setDone: (_: unknown, { id, done }: { id: string; done: boolean }) => {
      const todo = todos.find((todo) => todo.id === id);
      if (!todo) throw new Error("Todo not found");
      todo.done = done;
      // Trigger a channel update
      pubSub.publish(TODOS_CHANNEL, todos);
      return todo;
    },
  },
  Subscription: {
    todos: {
      subscribe: () => pubSub.subscribe(TODOS_CHANNEL),
      resolve: (payload: Todo) => payload,
    },
  },
};

const server = createServer({
  schema: {
    typeDefs,
    resolvers,
  },
});

server.start();

export default {
  async fetch(request) {
    return new Response("maya-ui worker alive", { status: 200 });
  },
};

# RAG explainer: research notes (2026-11-25)

- **Origin:** "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", Lewis et al., Facebook AI Research. Posted to arXiv in May 2020; NeurIPS 2020.
  - Motivation: models alone struggle to update their knowledge and can hallucinate.
  - Sources: https://arxiv.org/abs/2005.11401 , https://ai.meta.com/research/publications/retrieval-augmented-generation-for-knowledge-intensive-nlp-tasks/
- **RAG vs fine-tuning:**
  - RAG supplies knowledge at query time, and the model's weights stay unchanged.
  - Fine-tuning shapes behaviour: format, tone, style. It also freezes knowledge at training time.
  - Updating a document changes RAG's next answer, and RAG can cite sources.
  - Sources: https://www.databricks.com/blog/rag-vs-fine-tuning , https://www.progress.com/blogs/rag-vs-fine-tuning-when-to-use-which , https://arxiv.org/pdf/2312.10997
- **Pipeline as shown:**
  1. Chunk the documents.
  2. Embed each chunk into vectors; similar meanings land close together.
  3. Store them in a vector database.
  4. Embed the query and retrieve the top-k most similar chunks (k = 3 in the example).
  5. Add those chunks to the prompt.
  6. The LLM generates an answer with its sources.
  - Standard RAG description; see the survey https://arxiv.org/pdf/2312.10997
- The HR leave-policy bot is an illustrative example, not a real company.

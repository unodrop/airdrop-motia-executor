# NOTE: Some cloud providers will require you to specify the platform to match your target architecture
# i.e.: AWS Lightsail requires arm64, therefore you update your FROM statement to: FROM --platform=linux/arm64 motiadev/motia:latest
FROM motiadev/motia:latest

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Install dependencies (production only)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Move application files
COPY . .

# Expose outside access to the motia project
EXPOSE 3000

# Run your application
CMD ["bun", "run", "start"]
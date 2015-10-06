{{> libraries}}

x<-read.delim('{{{counts_file}}}',skip={{counts_skip}}, sep="{{{sep_char}}}", check.names=FALSE)
counts <- x[,{{{columns}}}]
keepMin <- apply(counts, 1, max) >= {{min_counts}}
keepCpm <- rowSums(cpm(counts)>{{min_cpm}}) >= {{min_cpm_samples}}                  # Keep only genes with cpm above x in at least y samples
keep <- keepMin & keepCpm
x <- x[keep,]
counts <- counts[keep,]
design <- {{{design}}}

